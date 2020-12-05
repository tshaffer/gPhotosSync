import mongoose from 'mongoose';

async function connectDB() {
// const connectDB = async () => {
  console.log('uri is:');
  console.log(process.env.MONGO_URI);
  const conn = await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
  });
  mongoose.Promise = global.Promise;

  console.log(`MongoDB Connected`);
};

export default connectDB;
