// Hook PreToolUse (Bash) : bloque les commandes qui touchent aux fichiers d'environnement
// (.env, .env.local…) où vivent les clés 17TRACK et Mapbox. Les règles « deny » de settings.json
// couvrent Read/Edit, mais pas un « cat .env.local » lancé via Bash. .env.example reste autorisé.
import { readFileSync } from "node:fs";

const input = JSON.parse(readFileSync(0, "utf8"));
const command = input.tool_input?.command ?? "";

// « .env » ou « .env.<suffixe> », sauf « .env.example », en tant que mot isolé dans la commande
const envFile = /(^|[\s'"/=<>])\.env(\.(?!example\b)[\w.-]+)?(?=$|[\s'";|&)<>])/;

if (envFile.test(command)) {
  console.error(
    "Commande bloquée : elle accède à un fichier d'environnement contenant des secrets. " +
      "Utilise .env.example comme référence, ou demande à l'utilisateur de lancer la commande lui-même.",
  );
  process.exit(2);
}
