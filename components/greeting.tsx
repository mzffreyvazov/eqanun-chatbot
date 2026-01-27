import { motion } from 'framer-motion';

export const Greeting = () => {
  return (
    <div
      key="overview"
      className="mt-4 mr-auto flex size-full max-w-3xl flex-col justify-center px-4 text-left md:mt-16 md:px-8"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.5 }}
        className="font-semibold text-xl md:text-2xl"
      >
        Salam, Xoş gəlmisiniz!
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.6 }}
        className="text-xl text-zinc-500 md:text-2xl"
      >
        Sizə necə kömək edə bilərəm?
      </motion.div>
    </div>
  );
};
