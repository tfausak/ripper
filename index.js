const fs = require('fs');

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
    const size = this.getInt32le();
    const start = this.position;
    const end = start + size - 1;

    this.position += size;

    return this.buffer.toString('latin1', start, end);
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

    return (upper << 8) + lower;
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
    value = {[parser.getString()]: parser.getString()};
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

const parseSection = (parser, parseBody) => {
  const size = parser.getUint32le();
  const crc = parser.getUint32le();
  const body = parseBody(parser);

  return {
    body,
    crc,
    size
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

// TODO
const parseFrames = (parser) => {
  const size = parser.getUint32le();

  parser.position += size;

  return [];
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

const parseContent = (parser) => {
  const levels = parseList(parser, (it) => it.getString());
  const keyFrames = parseList(parser, parseKeyFrame);
  const frames = parseFrames(parser);
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
  const content = parseSection(parser, parseContent);

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
