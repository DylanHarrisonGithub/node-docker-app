export const acceptedMediaExtensions = {
  font: ['.woff2', '.woff', '.ttf', '.otf'],
  image: ['.gif', '.jpg', '.jpeg', '.png', '.heic'],
  video: ['.mov', '.mp4', '.mpeg', '.webm', '.ogg'],
  audio: ['.mp3', '.wav', '.ogg']
};

export const timeData = {
  periods: [ 'Once', 'Daily', 'Weekly', 'BiWeekly', 'Monthly' ] as const,
  weekdays: [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday' 
  ] as const,
  months: [
    'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'
  ] as const,
  daysPerMonth: [
    31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31
  ] as const,
  years: [...[...Array(40).keys()].map(y => y+2020)] as const,
  dates: [...Array(32).keys()] as const,
  times: [...[...Array(24).keys()].reduce<string[]>((a,h)=> [ //should be 24
    ...a, 
    `${(h%12 || 12).toString().padStart(2,'0')}:00${h < 12 ? 'am' : 'pm'}`,
    `${(h%12 || 12).toString().padStart(2,'0')}:15${h < 12 ? 'am' : 'pm'}`,
    `${(h%12 || 12).toString().padStart(2,'0')}:30${h < 12 ? 'am' : 'pm'}`,
    `${(h%12 || 12).toString().padStart(2,'0')}:45${h < 12 ? 'am' : 'pm'}`,
  ], [])] as const
};

export const dbTypes = [
  'BIGINT' , 'BIGSERIAL' , 'BIT' , 'BIT VARYING' , 'BOOLEAN' , 'BOX' , 'BYTEA' , 'CHARACTER' , 
  'CHARACTER VARYING' , 'CIDR' , 'CIRCLE' , 'DATE' , 'DOUBLE PRECISION' , 'INET' , 'INTEGER' , 
  'INTERVAL' , 'JSON' , 'JSONB' , 'LINE' , 'LSEG' , 'MACADDR' , 'MACADDR8' , 'MONEY' , 'NUMERIC' , 
  'PATH' , 'PG_LSN' , 'POINT' , 'POLYGON' , 'REAL' , 'SMALLINT' , 'SMALLSERIAL' , 'SERIAL' , 
  'TEXT' , 'TIME' , 'TIMESTAMP' , 'TSQUERY' , 'TSVECTOR' , 'TXID_SNAPSHOT' , 'UUID' , 'XML'
] as const;
