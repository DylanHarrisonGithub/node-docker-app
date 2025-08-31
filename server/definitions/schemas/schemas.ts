import { COMMON_REGEXES, Schema } from "../../../server/services/validation/validation.service";

const imageFileRegex = /^(.*\/)?([^\/]+\.(jpg|jpeg|png|gif|bmp|webp|svg))$/i; //optionally beginning with a path ..
const videoFileRegex = /^(.*\/)?([^\/]+\.(mov|mpeg|mp4|webm|ogg))$/i;
const audioFileRegex = /^(.*\/)?([^\/]+\.(mp3|wav|ogg|aac))$/i;
const fileRegex = /^\/?(?:[\w\-\.\s\[\]\(\)]+\/)*[\w\-\.\s\[\]\(\]]+$/;
const usernameRegex = /^[a-zA-Z0-9][a-zA-Z0-9_-]*[a-zA-Z0-9]$/;
const dbSafeString = /^[a-zA-Z0-9\s\-_.,]*$/;
const path = /^\/(?:[a-zA-Z0-9_-]+\/?)*$/;
const urlRegex = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,6}(\/[^\s]*)?$/;

const Schemas: Schema = {
  email: { type: COMMON_REGEXES.EMAIL, attributes: { required: true, strLength: { minLength: 5, maxLength: 63 }}},
  filename: { type: fileRegex, attributes: { required: true, strLength: { minLength: 1, maxLength: 255 }}},
  path: { type: path, attributes: { required: true, strLength: { minLength: 1, maxLength: 255 }}},
  imageFilename: { type: imageFileRegex, attributes: { required: true, strLength: { minLength: 1, maxLength: 255 }}},
  videoFilename: { type: videoFileRegex, attributes: { required: true, strLength: { minLength: 1, maxLength: 255 }}},
  audioFilename: { type: audioFileRegex, attributes: { required: true, strLength: { minLength: 1, maxLength: 255 }}},
  id: { type: 'string | number', attributes: { required: true, range: { min: 0 } }},
  password: { type: COMMON_REGEXES.PASSWORD_STRONGEST, attributes: { required: true, strLength: { minLength: 8, maxLength: 255 }}},
  loginPassword: { type: 'string', attributes: { required: true }},
  username: { type: usernameRegex, attributes: { required: true, strLength: { minLength: 6, maxLength: 63 }}},
  otp: { type: 'string', attributes: { required: true, strLength: { minLength: 0, maxLength: 128 }}},
  sentence: { type: COMMON_REGEXES.COMMON_WRITING, attributes: { required: true, strLength: { minLength: 1, maxLength: 128 }}},
  paragraph: { type: COMMON_REGEXES.COMMON_WRITING, attributes: { required: true, strLength: { minLength: 1, maxLength: 1024 }}},
  dbSafeString: { type: dbSafeString, attributes: { required: true, strLength: { minLength: 1, maxLength: 1024 }}},
  privilege: { type: ['guest', 'user', 'admin'], attributes: { required: true }},
  url: { type: urlRegex, attributes: { required: true, strLength: { minLength: 1, maxLength: 512 }}},
  media_path: { type: 'string', attributes: { required: true, strLength: { minLength: 1, maxLength: 86 } }},
  media_meta: {
    type: {
      id: { type: 'string', attributes: { required: true } },
      mimeType: { type: 'string', attributes: { required: true } },
      width: { type: 'string', attributes: { required: true } },
      height: { type: 'string', attributes: { required: true } },
    },
    attributes: { required: false }
  },
};

export default Schemas;