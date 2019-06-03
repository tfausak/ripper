/* eslint no-console: "off" */
'use strict';

const assert = require('assert').strict;
const fs = require('fs');
const path = require('path');
const ripper = require('./index');

const DIRECTORY = 'replays';

fs.readdir(DIRECTORY, (error, files) => {
  if (error) {
    throw error;
  }
  files.forEach((file) => {
    console.log(file);
    fs.readFile(path.join(DIRECTORY, file), (error, buffer1) => {
      if (error) {
        throw error;
      }
      const replay1 = ripper.parse(buffer1);
      const json = JSON.stringify(replay1);
      const replay2 = JSON.parse(json);
      const buffer2 = ripper.generate(replay2);
      const replay3 = ripper.parse(buffer2);
      assert.deepEqual(replay1, replay3);
    });
  });
});
