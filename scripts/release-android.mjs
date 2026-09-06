// Erzeugt ein neues, signiertes Android-Bundle für den Play Store.
//
//   npm run release:android            -> versionCode +1, versionName bleibt
//   npm run release:android -- 1.1     -> versionCode +1, versionName = 1.1
//   npm run release:android -- --dry-run   nur prüfen, nichts ändern/bauen
//
// Schritte: versionCode/versionName in android/app/build.gradle anpassen,
// Web-Build, nach Android kopieren, Gradle bundleRelease, Bundle nach store/
// kopieren. Danach die Änderung an build.gradle committen.

import { execSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const gradleFile = join(root, 'android', 'app', 'build.gradle');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const newName = args.find((a) => !a.startsWith('--'));

if (newName && !/^\d+(\.\d+){1,2}$/.test(newName)) {
  console.error(`Ungültige Versionsbezeichnung "${newName}". Erwartet z. B. 1.1 oder 1.2.3.`);
  process.exit(1);
}

const gradle = readFileSync(gradleFile, 'utf8');
const codeMatch = gradle.match(/versionCode (\d+)/);
const nameMatch = gradle.match(/versionName "([^"]+)"/);
if (!codeMatch || !nameMatch) {
  console.error('versionCode/versionName in android/app/build.gradle nicht gefunden.');
  process.exit(1);
}
const oldCode = Number(codeMatch[1]);
const nextCode = oldCode + 1;
const nextName = newName ?? nameMatch[1];

console.log(`Version: ${nameMatch[1]} (${oldCode})  ->  ${nextName} (${nextCode})`);

if (!existsSync(join(root, 'android', 'keystore.properties'))) {
  console.error(
    'android/keystore.properties fehlt. Kopie aus ~/hundeapp-signing/ anlegen, sonst ist das Bundle unsigniert.'
  );
  process.exit(1);
}

if (dryRun) {
  console.log('Probelauf: nichts geändert, nichts gebaut.');
  process.exit(0);
}

writeFileSync(
  gradleFile,
  gradle
    .replace(/versionCode \d+/, `versionCode ${nextCode}`)
    .replace(/versionName "[^"]+"/, `versionName "${nextName}"`)
);

// iOS gleich mitziehen (Marketing Version und Build-Nummer), damit beide
// Plattformen dieselbe Version tragen.
const pbxproj = join(root, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
if (existsSync(pbxproj)) {
  writeFileSync(
    pbxproj,
    readFileSync(pbxproj, 'utf8')
      .replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${nextName};`)
      .replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${nextCode};`)
  );
  console.log(`iOS: MARKETING_VERSION ${nextName}, Build ${nextCode}`);
}

// package.json-Version an den Namen angleichen (x.y → x.y.0).
const pkgFile = join(root, 'package.json');
const pkgJson = JSON.parse(readFileSync(pkgFile, 'utf8'));
const semver = nextName.split('.').length === 2 ? `${nextName}.0` : nextName;
if (pkgJson.version !== semver) {
  pkgJson.version = semver;
  writeFileSync(pkgFile, JSON.stringify(pkgJson, null, 2) + '\n');
}

// JDK 21 für Gradle (Android Studio bringt ein neueres JDK mit, das Gradle 8 nicht kann)
const env = { ...process.env };
if (!env.JAVA_HOME && process.platform === 'darwin') {
  try {
    env.JAVA_HOME = execSync('/usr/libexec/java_home -v 21', { encoding: 'utf8' }).trim();
  } catch {
    /* Gradle nutzt dann org.gradle.java.home aus ~/.gradle/gradle.properties */
  }
}

const run = (cmd, cwd = root) => {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit', env });
};

try {
  run('npm run build');
  run('npx cap sync android');
  run('./gradlew bundleRelease -q', join(root, 'android'));
} catch {
  console.error(
    '\nBuild fehlgeschlagen. build.gradle wurde bereits hochgezählt; bei Bedarf zurücksetzen.'
  );
  process.exit(1);
}

const aab = join(
  root,
  'android',
  'app',
  'build',
  'outputs',
  'bundle',
  'release',
  'app-release.aab'
);
const target = join(root, 'store', `hundeapp-${nextName}-${nextCode}-release.aab`);
copyFileSync(aab, target);

console.log(`
Fertig: ${target}
Nächste Schritte:
  1. git add -A && git commit -m "Release ${nextName} (${nextCode})"
  2. Bundle in der Play Console hochladen (Testen und veröffentlichen -> Track -> Neuen Release erstellen)
`);
