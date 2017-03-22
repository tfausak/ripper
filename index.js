const fs = require('fs');

const BitParser = class {
  constructor (buffer, bytePosition) {
    this.buffer = buffer;
    this.bytePosition = bytePosition;
    this.bitPosition = 0;
  }

  getBit () {
    const byte = this.buffer[this.bytePosition];
    const mask = 0b00000001 << this.bitPosition;
    const bit = byte & mask;

    this.bitPosition += 1;
    if (this.bitPosition >= 8) {
      this.bytePosition += 1;
      this.bitPosition -= 8;
    }

    return bit !== 0;
  }

  getByte () {
    return (
      this.getBit() << 0 |
      this.getBit() << 1 |
      this.getBit() << 2 |
      this.getBit() << 3 |
      this.getBit() << 4 |
      this.getBit() << 5 |
      this.getBit() << 6 |
      this.getBit() << 7
    );
  }

  getFloat32le () {
    return Buffer.from([
      this.getByte(),
      this.getByte(),
      this.getByte(),
      this.getByte()
    ]).readFloatLE();
  }
};

const normalizeSize = (rawSize) => {
  if (rawSize === 0x05000000) {
    return 8;
  }

  return rawSize;
};

const normalizeString = (rawString) => rawString.replace(/\0+/g, '');

const Parser = class {
  constructor (buffer) {
    this.buffer = buffer;
    this.position = 0;
  }

  getFloat32le () {
    const result = this.buffer.readFloatLE(this.position);

    this.position += 4;

    return result;
  }

  getInt32le () {
    const result = this.buffer.readInt32LE(this.position);

    this.position += 4;

    return result;
  }

  getString () {
    const rawSize = this.getInt32le();
    const size = normalizeSize(rawSize);
    const start = this.position;
    const end = start + size - 1;
    const rawResult = this.buffer.toString('ascii', start, end);
    const result = normalizeString(rawResult);

    this.position += size;

    return result;
  }

  getUint8le () {
    const result = this.buffer.readUInt8(this.position);

    this.position += 1;

    return result;
  }

  getUint32le () {
    const result = this.buffer.readUInt32LE(this.position);

    this.position += 4;

    return result;
  }

  getUint64le () {
    const upper = this.getUint32le();
    const lower = this.getUint32le();
    const result = (upper << 8) + lower;

    return result;
  }
};

const parseDictionary = (parser, parseValue) => {
  const dictionary = {};

  while (true) {
    const key = parser.getString();

    if (key === 'None') {
      break;
    }
    dictionary[key] = parseValue(parser);
  }

  return dictionary;
};

const parseList = (parser, parseElement) => {
  const list = [];
  let size = parser.getUint32le();

  while (size > 0) {
    list.push(parseElement(parser));
    size -= 1;
  }

  return list;
};

const parseByteProperty = (parser) => {
  let key = parser.getString();
  let value = null;

  if (key === 'OnlinePlatform_Steam') {
    value = key;
    key = 'OnlinePlatform';
  } else {
    value = parser.getString();
  }

  return {[key]: value};
};

const parseProperty = (parser) => {
  const type = parser.getString();
  const size = parser.getUint64le();
  let value = null;

  switch (type) {
  case 'ArrayProperty':
    value = parseList(parser, (it) => parseDictionary(it, parseProperty));
    break;
  case 'BoolProperty':
    value = parser.getUint8le();
    break;
  case 'ByteProperty':
    value = parseByteProperty(parser);
    break;
  case 'FloatProperty':
    value = parser.getFloat32le();
    break;
  case 'IntProperty':
    value = parser.getInt32le();
    break;
  case 'NameProperty':
    value = parser.getString();
    break;
  case 'QWordProperty':
    value = parser.getUint64le();
    break;
  case 'StrProperty':
    value = parser.getString();
    break;
  default:
    throw new Error(`unknown property value type ${type}`);
  }

  return {
    size,
    type,
    value
  };
};

const parseSection = (parser, parseValue) => {
  const size = parser.getUint32le();
  const crc = parser.getUint32le();
  const value = parseValue(parser);

  return {
    crc,
    size,
    value
  };
};

const parseHeader = (parser) => {
  const majorVersion = parser.getUint32le();
  const minorVersion = parser.getUint32le();
  const label = parser.getString();
  const properties = parseDictionary(parser, parseProperty);

  return {
    label,
    majorVersion,
    minorVersion,
    properties
  };
};

const parseKeyFrame = (parser) => {
  const time = parser.getFloat32le();
  const frame = parser.getUint32le();
  const position = parser.getUint32le();

  return {
    frame,
    position,
    time
  };
};

const parseFrame = (parser) => {
  const time = parser.getFloat32le();
  const delta = parser.getFloat32le();
  // TODO

  return {
    delta,
    time
  };
};

const parseFrames = (parser, numFrames) => {
  const size = parser.getUint32le();
  const bitParser = new BitParser(parser.buffer, parser.position);
  const value = [];

  for (let frame = 0; frame < numFrames; frame += 1) {
    value.push(parseFrame(bitParser));
  }
  parser.position += size;

  return {
    size,
    value
  };
};

const parseMessage = (parser) => {
  const frame = parser.getFloat32le();
  const name = parser.getString();
  const value = parser.getString();

  return {
    frame,
    name,
    value
  };
};

const parseMark = (parser) => {
  const value = parser.getString();
  const frame = parser.getUint32le();

  return {
    frame,
    value
  };
};

const parseClassMapping = (parser) => {
  const name = parser.getString();
  const streamId = parser.getUint32le();

  return {
    name,
    streamId
  };
};

const parseAttributeMapping = (parser) => {
  const objectId = parser.getUint32le();
  const streamId = parser.getUint32le();

  return {
    objectId,
    streamId
  };
};

const parseCache = (parser) => {
  const classId = parser.getUint32le();
  const parentCacheId = parser.getUint32le();
  const cacheId = parser.getUint32le();
  const attributeMappings = parseList(parser, parseAttributeMapping);

  return {
    attributeMappings,
    cacheId,
    classId,
    parentCacheId
  };
};

const parseContent = (parser, numFrames) => {
  const levels = parseList(parser, (it) => it.getString());
  const keyFrames = parseList(parser, parseKeyFrame);
  const frames = parseFrames(parser, numFrames);
  const messages = parseList(parser, parseMessage);
  const marks = parseList(parser, parseMark);
  const packages = parseList(parser, (it) => it.getString());
  const objects = parseList(parser, (it) => it.getString());
  const names = parseList(parser, (it) => it.getString());
  const classMappings = parseList(parser, parseClassMapping);
  const caches = parseList(parser, parseCache);

  return {
    caches,
    classMappings,
    frames,
    keyFrames,
    levels,
    marks,
    messages,
    names,
    objects,
    packages
  };
};

const parseReplay = (parser) => {
  const header = parseSection(parser, parseHeader);
  const numFrames = (header.value.properties.NumFrames || {}).value || 0;
  const content = parseSection(parser, (it) => parseContent(it, numFrames));

  return {
    content,
    header
  };
};

const main = (event, callback) => {
  const file = event.data;

  if (file.resourceState !== 'exists') {
    return callback(null, null);
  }

  fs.readFile(file.name, (error, buffer) => {
    if (error) {
      return callback(error, null);
    }

    try {
      const parser = new Parser(buffer);
      const replay = parseReplay(parser);

      return callback(null, replay);
    } catch (exception) {
      return callback(exception, null);
    }
  });
};

module.exports = {main};
