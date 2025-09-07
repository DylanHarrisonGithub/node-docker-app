import { Model } from '../models';
import Schemas from '../../schemas/schemas';

import { PSQLTable } from '../models';

export type FontFam = | { src: string; family?: never } | { src?: never; family: string };

export type Theme = {
  id: number,
  cards: {
    primary: string,
    secondary: string,
    tertiary: string,
  },
  forms: {
    primary: string,
    secondary: string,
    tertiary: string,
  },
  buttons: {
    primary: string,
    secondary: string,
    tertiary: string
  },
  fonts: {
    primary: FontFam
    secondary: FontFam
    tertiary: FontFam
  },
  backgrounds: {
    primary: {
      path: string,
      meta?: { id: string, mimeType: string, width: number, height: number },
    },
    about?: {
      path: string,
      meta?: { id: string, mimeType: string, width: number, height: number },
    },
    contact?: {
      path: string,
      meta?: { id: string, mimeType: string, width: number, height: number },
    },
    events?: {
      path: string,
      meta?: { id: string, mimeType: string, width: number, height: number },
    },
    news?: {
      path: string,
      meta?: { id: string, mimeType: string, width: number, height: number },
    },
    artists?: {
      path: string,
      meta?: { id: string, mimeType: string, width: number, height: number },
    }
  }
  content: {
    avatar: {
      path: string,
      meta?: { id: string, mimeType: string, width: number, height: number },
    }
    about: string,
    links: string,
    three_cards?: {
      card1: {
        text: string,
        path: string,
        meta?: { id: string, mimeType: string, width: number, height: number },
      },
      card2: {
        text: string,
        path: string,
        meta?: { id: string, mimeType: string, width: number, height: number },
      },
      card3: {
        text: string,
        path: string,
        meta?: { id: string, mimeType: string, width: number, height: number },
      }
    }
  },
}


export const defaultTheme: Theme = { 
  id: -1,
  cards: {
    primary: `backdrop-blur-2xl`,
    secondary: ` backdrop-blur-2xl bg-opacity-25 bg-blue-400`,
    tertiary: 'backdrop-blur-2xl bg-opacity-50 bg-slate-600',
  },
  forms: {
    primary: `bg-blue-500 bg-opacity-50 text-white shadow-sm`,
    secondary: `bg-slate-500 bg-opacity-50 text-white shadow-sm`,
    tertiary: `bg-pink-500 bg-opacity-50 text-white shadow-sm`
  },
  buttons: {
    primary: `bg-slate-700 rounded-none`,
    secondary: `bg-blue-400 rounded-none`,
    tertiary: `rounded-sm bg-slate-100 bg-opacity-90 text-slate-400`
  },
  fonts: {
    primary: {
      family: 'Andale Mono'
    },
    secondary: {
      family: 'Courier New'
    },
    tertiary: {
      family: 'Brush Script MT'
    }
  },
  backgrounds: {
    primary: {
      path: `http://localhost:3000/public/static/0ebf1af49b89415deb6a6a45fa05936896cfdf5e.jpg`,
      // meta: undefined
    },
    // about?: {
    //   path: string,
    //   meta?: { id: string, mimeType: string, width: number, height: number },
    // },
    // contact?: {
    //   path: string,
    //   meta?: { id: string, mimeType: string, width: number, height: number },
    // },
    // events?: {
    //   path: string,
    //   meta?: { id: string, mimeType: string, width: number, height: number },
    // },
    // news?: {
    //   path: string,
    //   meta?: { id: string, mimeType: string, width: number, height: number },
    // },
    // artists?: {
    //   path: string,
    //   meta?: { id: string, mimeType: string, width: number, height: number },
    // }
  },
  content: {
    avatar: {
      path: `http://localhost:3000/public/static/man_user_avatar_person.jpg`,
      // meta?: { id: string, mimeType: string, width: number, height: number },
    },
    links: '',
    about: `The Riverwest Department of Party Works is a vibrant ensemble of electronic dance music artists who have come together to push the boundaries of sound and creativity. Hailing from diverse musical backgrounds, each member brings a unique flavor, blending elements of house, techno, and bass music to create an electrifying sonic experience. Their collaborative performances are known for their high energy and immersive visuals, often transforming ordinary spaces into euphoric dance havens. Through regular workshops and community events, they not only share their skills and knowledge but also foster a sense of unity among fans and aspiring artists alike. The RDPW is more than just a group; it's a movement dedicated to celebrating the power of music as a universal language that connects people from all walks of life.`
  },
} as const;

const themeTable = {
  id: `SERIAL`,
  cards: `TEXT`,
  forms: `TEXT`,
  buttons: `TEXT`,
  fonts: `TEXT`,
  backgrounds: `TEXT`,
  content: `TEXT`,
  PRIMARY: `KEY (id)`
} satisfies PSQLTable;

const ThemeModel: Model<typeof themeTable, Theme> = {

  fromDB: (dbModel) => { return Object.keys(dbModel).reduce((acc, key) => ({ ...acc, [key]: JSON.parse(dbModel[key as keyof typeof dbModel]) }), {}) as Theme },
  toDB: (model) => { return Object.keys(model).reduce((acc, key) => ({ ...acc, [key]: JSON.stringify(model[key as keyof typeof model]) }), {}) },

  db: themeTable,

  schema: {
    id: Schemas.id,
    cards: {
      type: {
        primary: { type: 'string', attributes: { required: true }},
        secondary: { type: 'string', attributes: { required: true }},
        tertiary: { type: 'string', attributes: { required: true }},
      },
      attributes: { required: true }
    },
    forms: {
      type: {
        primary: { type: 'string', attributes: { required: true }},
        secondary: { type: 'string', attributes: { required: true }},
        tertiary: { type: 'string', attributes: { required: true }},
      },
      attributes: { required: true }
    },
    buttons: {
      type: {
        primary: { type: 'string', attributes: { required: true }},
        secondary: { type: 'string', attributes: { required: true }},
        tertiary: { type: 'string', attributes: { required: true }},
      },
      attributes: { required: true }
    },
    fonts: {
      type: {
        primary: { type: {
          src: { type: 'string', attributes: { required: false }},
          family: { type: 'string', attributes: { required: false }},
        }, attributes: { required: true }},
        secondary: { type: {
          src: { type: 'string', attributes: { required: false }},
          family: { type: 'string', attributes: { required: false }},
        }, attributes: { required: true }},
        tertiary: { type: {
          src: { type: 'string', attributes: { required: false }},
          family: { type: 'string', attributes: { required: false }},
        }, attributes: { required: true }},
      },
      attributes: { required: true }
    },
    backgrounds: {
      type: {
        primary: { type: { path: Schemas.media_path, meta: Schemas.media_meta }, attributes: { required: true } },
        about: { type: { path: Schemas.media_path, meta: Schemas.media_meta }, attributes: { required: false } },
        contact: { type: { path: Schemas.media_path, meta: Schemas.media_meta }, attributes: { required: false } },
        events: { type: { path: Schemas.media_path, meta: Schemas.media_meta }, attributes: { required: false } },
        news: { type: { path: Schemas.media_path, meta: Schemas.media_meta }, attributes: { required: false } },
        artists: { type: { path: Schemas.media_path, meta: Schemas.media_meta }, attributes: { required: false } },
      },
      attributes: { required: true }
    },
    content: {
      type: {
        avatar: { type: { path: Schemas.media_path, meta: Schemas.media_meta }, attributes: { required: true } },
        about: { type: 'string', attributes: { required: true }},
        links: { type: /^\s*(https?:\/\/[^\s]+(\s+https?:\/\/[^\s]+)*)?\s*$/, attributes: { required: true }} //whitespace separated links
      },
      attributes: { required: true }
    }
  }
};

export default ThemeModel;