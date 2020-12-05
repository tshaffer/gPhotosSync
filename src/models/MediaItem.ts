import * as mongoose from 'mongoose';

const Schema = mongoose.Schema;

const MediaitemSchema = new Schema(
  {
      id: {type: String, required: true, unique: true},
      baseUrl: {type: String, required: true},
      fileName: {type: String, required: true},
      downloaded: {type: Boolean, default: false},
      filePath: {type: String, default: ''},
      productUrl: {type: String},
      mimeType: {type: String},
      creationTime: {type: Date},
      width: {type: Number},
      height: {type: Number},
  }
);

export default mongoose.model('Mediaitem', MediaitemSchema);
