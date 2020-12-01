import mongoose from 'mongoose';

const connectDB = async () => {
  console.log('uri is:');
  console.log(process.env.MONGO_URI);
  const conn = await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
  });

  console.log(`MongoDB Connected`);
};

export default connectDB;
