import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

export interface DoctorCheck {
  name: string
  status: 'pass' | 'fail' | 'warn'
  message: string
}

export interface DoctorResult {
  checks: DoctorCheck[]
  allPassed: boolean
}

function checkCommand(cmd: string): string | null {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim()
  } catch {
    return null
  }
}

export function runDoctor(repoPath: string): DoctorResult {
  const checks: DoctorCheck[] = []

  // Node.js
  const nodeVersion = checkCommand('node --version')
  if (!nodeVersion) {
    checks.push({ name: 'Node.js', status: 'fail', message: 'Not found in PATH' })
  } else {
    const major = parseInt(nodeVersion.replace('v', '').split('.')[0], 10)
    checks.push(
      major >= 20
        ? { name: 'Node.js', status: 'pass', message: nodeVersion }
        : { name: 'Node.js', status: 'fail', message: `>= 20 required, found ${nodeVersion}` },
    )
  }

  // Git
  const gitVersion = checkCommand('git --version')
  checks.push(
    gitVersion
      ? { name: 'Git', status: 'pass', message: gitVersion }
      : { name: 'Git', status: 'fail', message: 'Not found in PATH' },
  )

  // project.yaml
  const yamlPath = resolve(repoPath, 'project.yaml')
  checks.push(
    existsSync(yamlPath)
      ? { name: 'project.yaml', status: 'pass', message: 'Found' }
      : { name: 'project.yaml', status: 'warn', message: 'Not found. Run "harness init".' },
  )

  // docs/
  const docsPath = resolve(repoPath, 'docs')
  checks.push(
    existsSync(docsPath)
      ? { name: 'docs/', status: 'pass', message: 'Found' }
      : { name: 'docs/', status: 'warn', message: 'Not found. Run "harness init".' },
  )

  return { checks, allPassed: checks.every((c) => c.status !== 'fail') }
}
