import chalk from 'chalk';

export function object(object: Record<string, any>) {
  return Object.entries(object)
    .map(([key, value]) => `${chalk.bold.green(key)}: ${value}`)
    .join(', ');
}

export default { object };
