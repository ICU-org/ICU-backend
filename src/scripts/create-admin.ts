/*
 * Создать админа или сменить ему пароль:
 *   npm run admin:create -- <login>            — спросит пароль дважды (без эха)
 *   npm run admin:create -- <login> --reset    — новый пароль существующему, его сессии закрываются
 *   echo 'пароль' | npm run admin:create -- <login>   — пароль из stdin (для скриптов)
 * Публичного эндпоинта для этого нет намеренно.
 */
import "./quietLogs"; // до dotenv: иначе LOG_LEVEL=debug из .env выведет SQL в консоль
import "dotenv/config";
import { createAdmin } from "../modules/auth";

const askHidden = (question: string) =>
  new Promise<string>((resolve) => {
    const stdin = process.stdin;
    process.stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let value = "";
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", onData);
          process.stdout.write("\n");
          return resolve(value);
        }
        if (ch === "\u0003") process.exit(130); // Ctrl+C
        if (ch === "\u007f") value = value.slice(0, -1); // Backspace
        else value += ch;
      }
    };
    stdin.on("data", onData);
  });

const readStdinLine = async () => {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data.split(/\r?\n/)[0] ?? "";
};

async function main() {
  const args = process.argv.slice(2);
  const login = args.find((a) => !a.startsWith("--"));
  const reset = args.includes("--reset");
  if (!login) {
    console.error("Usage: npm run admin:create -- <login> [--reset]");
    process.exit(1);
  }

  let password: string;
  if (process.stdin.isTTY) {
    password = await askHidden("Password: ");
    if ((await askHidden("Repeat password: ")) !== password) {
      console.error("Passwords do not match");
      process.exit(1);
    }
  } else {
    password = await readStdinLine();
  }

  const result = await createAdmin(login, password, { reset });
  console.log(result.created ? `Admin "${result.login}" created` : `Password of "${result.login}" changed, sessions closed`);
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
