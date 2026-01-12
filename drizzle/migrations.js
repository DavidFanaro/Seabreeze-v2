// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_gray_mastermind.sql';
import m0001 from './0001_daffy_pyro.sql';
import m0002 from './0002_tiresome_red_shift.sql';

  export default {
    journal,
    migrations: {
      m0000,
m0001,
m0002
    }
  }
  