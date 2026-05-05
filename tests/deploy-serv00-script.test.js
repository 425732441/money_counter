import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const scriptPath = "scripts/deploy-serv00.ps1";
const packageScriptPath = "scripts/package-release.ps1";
const script = existsSync(scriptPath) ? readFileSync(scriptPath, "utf8") : "";
const packageScript = existsSync(packageScriptPath) ? readFileSync(packageScriptPath, "utf8") : "";
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

describe("Serv00 deployment script", () => {
  it("exists as a PowerShell deployment helper", () => {
    assert.equal(existsSync(scriptPath), true);
  });

  it("uses the configured Serv00 defaults and a valid hyphenated site domain", () => {
    assert.match(script, /\$DefaultHost\s*=\s*"s11\.serv00\.com"/);
    assert.match(script, /\$DefaultUser\s*=\s*"hualeizhang"/);
    assert.match(script, /\$DefaultDomain\s*=\s*"money-counter\.hualeizhang\.serv00\.net"/);
    assert.doesNotMatch(script, /money_counter\.hualeizhang\.serv00\.net/);
  });

  it("prompts for account details while leaving password entry to OpenSSH", () => {
    assert.match(script, /Read-WithDefault\s+"SSH host"/);
    assert.match(script, /Read-WithDefault\s+"SSH username"/);
    assert.match(script, /OpenSSH will prompt for the password/);
    assert.doesNotMatch(script, /\$Password|Read-Host\s+-AsSecureString|ConvertFrom-SecureString/i);
  });

  it("packages release artifacts before uploading H5 files", () => {
    assert.match(script, /Invoke-External\s+"npm"\s+@?\("run",\s*"package:release"\)/);
    assert.match(script, /dist[\\/]h5/);
    assert.match(script, /public_html/);
    assert.match(script, /scp/);
    assert.match(script, /download/);
    assert.doesNotMatch(script, /Upload Windows installer to \/download\?/);
  });

  it("wraps upload items as an array for PowerShell StrictMode", () => {
    assert.match(script, /\$UploadItems\s*=\s*@\(Get-ChildItem\s+-LiteralPath\s+\$UploadSource\s+-Force\)/);
  });

  it("uploads installer and portable release files to separate download directories", () => {
    assert.match(script, /\$ReleaseRoot\s*=\s*Join-Path\s+\(Get-Location\)\s+"release"/);
    assert.match(script, /\$RemoteInstallerRoot\s*=\s*"\$DownloadRoot\/installer"/);
    assert.match(script, /\$RemotePortableRoot\s*=\s*"\$DownloadRoot\/portable"/);
    assert.match(script, /Copy-RemoteFiles\s+\$InstallerReleaseDir\s+"installer"\s+\$RemoteInstallerRoot/);
    assert.match(script, /Copy-RemoteFiles\s+\$PortableReleaseDir\s+"portable"\s+\$RemotePortableRoot/);
  });

  it("has a release packaging script that creates versioned installer and portable files", () => {
    assert.equal(existsSync(packageScriptPath), true);
    assert.match(packageScript, /\$Version\s*=\s*\$Package\.version/);
    assert.match(packageScript, /MoneyCounter-\$Version-setup\.exe/);
    assert.match(packageScript, /MoneyCounter-\$Version-portable\.exe/);
    assert.match(packageScript, /src-tauri[\\/]target[\\/]release[\\/]money-counter-spike\.exe/);
    assert.match(packageScript, /src-tauri[\\/]target[\\/]release[\\/]bundle[\\/]nsis[\\/]Money Counter Spike_\$\{Version\}_x64-setup\.exe/);
    assert.doesNotMatch(packageScript, /Spike_\$Version_x64/);
  });

  it("exposes an npm shortcut for the deployment script", () => {
    assert.equal(
      packageJson.scripts["deploy:serv00"],
      "powershell -ExecutionPolicy Bypass -File scripts/deploy-serv00.ps1",
    );
    assert.equal(
      packageJson.scripts["package:release"],
      "powershell -ExecutionPolicy Bypass -File scripts/package-release.ps1",
    );
  });
});
