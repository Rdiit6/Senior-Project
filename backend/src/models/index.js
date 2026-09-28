'use strict';

// Builds every data-access module from one database handle (a pg Pool or Client).
// Only this folder writes SQL.

const { createUsers } = require('./users');
const { createCheckins } = require('./checkins');
const { createNoteAnalyses } = require('./noteAnalyses');
const { createResources } = require('./resources');
const { createCrisisKeywords } = require('./crisisKeywords');
const { createThemes } = require('./themes');

function createModels(db) {
  return {
    users: createUsers(db),
    checkins: createCheckins(db),
    noteAnalyses: createNoteAnalyses(db),
    resources: createResources(db),
    crisisKeywords: createCrisisKeywords(db),
    themes: createThemes(db),
  };
}

module.exports = { createModels };
