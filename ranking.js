@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: 'Segoe UI', system-ui, sans-serif;
}

.square {
  @apply inline-block w-4 h-6 sm:w-5 sm:h-7 border border-gold/60 rounded-[2px];
}
.square-top {
  @apply bg-gold border-gold;
}
.square-zone {
  background: linear-gradient(to top, #f2c14e 50%, transparent 50%);
}
.square-empty {
  @apply bg-transparent;
}
