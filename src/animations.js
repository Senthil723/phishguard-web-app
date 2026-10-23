// Shared Motion settings ("variants") for the whole app.
// Keep this file free of React components so the linter stays happy.

// Put on a PARENT element: its children appear one after another.
export const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

// Put on each CHILD: a short fade-and-rise.
export const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

// Spread on a <motion.button>:  <motion.button {...pressFeedback}>
// The button shrinks a little while pressed. Short, with no bounce.
export const pressFeedback = {
  whileTap: { scale: 0.97 },
  transition: { duration: 0.1 },
};
