import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { appendAuditJsonl, AUDIT_LIMIT, setAuditLimit } from "./audit.js";
import { resolveGlobalHome } from "../lib/repo.js";
import { existsSync, rmSync, mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { gunzipSync } from "node:zlib";

describe("audit.ts", () => {
  const tempDirs: string[] = [];
  let originalHarnessHome: string | undefined;
  let originalAuditLimit: number;

  beforeEach(() => {
    originalHarnessHome = process.env.HARNESS_HOME;
    const baseTemp = mkdtempSync(join(tmpdir(), "harness-audit-test-"));
    const tempHome = join(baseTemp, ".harness");
    process.env.HARNESS_HOME = tempHome;
    tempDirs.push(baseTemp);

    // Save configuration settings
    originalAuditLimit = AUDIT_LIMIT;
  });

  afterEach(() => {
    // Restore configuration settings
    process.env.HARNESS_HOME = originalHarnessHome;
    setAuditLimit(originalAuditLimit);

    for (const dir of tempDirs) {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
    tempDirs.length = 0;
  });

  it("appends log line cleanly to audit.jsonl", () => {
    const home = resolveGlobalHome();
    const filePath = join(home, "audit.jsonl");

    appendAuditJsonl({
      event_type: "test_event",
      payload: { value: 42 },
      timestamp: "2026-06-10T12:00:00Z",
    });

    expect(existsSync(filePath)).toBe(true);
    const content = readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(content.trim());
    expect(parsed.event_type).toBe("test_event");
    expect(parsed.payload.value).toBe(42);
  });

  it("compresses when limit is exceeded, creating a timestamped backup file, but does NOT truncate audit.jsonl", () => {
    const home = resolveGlobalHome();
    const filePath = join(home, "audit.jsonl");

    setAuditLimit(100);

    // First write
    appendAuditJsonl({
      event_type: "small",
      payload: {},
      timestamp: "2026",
    });
    expect(existsSync(filePath)).toBe(true);

    // Second write - exceeds 100 bytes total, triggers backup
    appendAuditJsonl({
      event_type: "another_event_to_exceed_limit_easily",
      payload: { extra: "some longer text to make it definitely larger than 100 bytes limit" },
      timestamp: "2026-06-10T12:00:00Z",
    });

    // Find any gz backup files in the home directory
    const files = readdirSync(home);
    const gzFiles = files.filter(f => f.match(/^audit\.\d{8}-\d{6}(-\d+)?\.jsonl\.gz$/));
    expect(gzFiles.length).toBe(1);

    const backupPath = join(home, gzFiles[0]);

    // Verify compressed content contains both events
    const compressed = readFileSync(backupPath);
    const decompressed = gunzipSync(compressed).toString("utf-8");
    expect(decompressed).toContain("small");
    expect(decompressed).toContain("another_event_to_exceed_limit_easily");

    // audit.jsonl MUST NOT be truncated! It should still contain the events.
    const currentContent = readFileSync(filePath, "utf-8");
    expect(currentContent).toContain("small");
    expect(currentContent).toContain("another_event_to_exceed_limit_easily");
  });

  it("does not compress again on subsequent writes until size grows by another AUDIT_LIMIT, and saves all backups permanently", () => {
    const home = resolveGlobalHome();

    setAuditLimit(100);

    // Exceed 100 bytes immediately
    appendAuditJsonl({
      event_type: "initial_large_event_to_trigger_first_backup",
      payload: { data: "large_data_to_exceed_limit_immediately_without_waiting_longer" },
      timestamp: "2026",
    });

    const files1 = readdirSync(home).filter(f => f.match(/^audit\.\d{8}-\d{6}(-\d+)?\.jsonl\.gz$/));
    expect(files1.length).toBe(1);

    // Write a third small event (total size increased slightly but hasn't grown by another 100 bytes)
    appendAuditJsonl({
      event_type: "small_no_backup",
      payload: {},
      timestamp: "2026",
    });

    // Still only 1 backup file
    const files2 = readdirSync(home).filter(f => f.match(/^audit\.\d{8}-\d{6}(-\d+)?\.jsonl\.gz$/));
    expect(files2.length).toBe(1);

    // Write an event large enough to grow the file size by another 100 bytes
    appendAuditJsonl({
      event_type: "huge_event_to_grow_by_another_100_bytes_easily_for_second_backup",
      payload: { info: "lots of extra text here to force another growth of 100 bytes" },
      timestamp: "2026-06-10",
    });

    // We should now have 2 separate backup files permanently kept!
    const files3 = readdirSync(home).filter(f => f.match(/^audit\.\d{8}-\d{6}(-\d+)?\.jsonl\.gz$/));
    expect(files3.length).toBe(2);
  });
});
