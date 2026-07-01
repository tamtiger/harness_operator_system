#!/usr/bin/env node
import { Command } from 'commander'
import { runDoctor } from './commands/doctor.js'
import { initProject } from './commands/init.js'

const program = new Command()

program
  .name('harness')
  .description('Universal Coding Harness — orchestration layer for AI Coding Agents')
  .version('0.1.0')

program.command('doctor').description('Check environment prerequisites').action(() => {
  const result = runDoctor(process.cwd())

  console.log('\n🏥 Harness Doctor')
  console.log('─'.repeat(50))
  for (const check of result.checks) {
    const icon = check.status === 'pass' ? '✓' : check.status === 'warn' ? '⚠' : '✗'
    console.log(`  ${icon} ${check.name}: ${check.message}`)
  }
  console.log('')
  if (result.allPassed) {
    console.log('  ✓ All checks passed.\n')
  } else {
    console.log('  ✗ Some checks failed.\n')
    process.exitCode = 1
  }
})

program.command('init').description('Initialize project.yaml + docs/ templates').action(() => {
  const result = initProject(process.cwd())

  console.log('\n🔧 Harness Init')
  console.log('─'.repeat(50))
  if (result.created.length > 0) {
    console.log('  Created:')
    for (const f of result.created) console.log(`    + ${f}`)
  }
  if (result.skipped.length > 0) {
    console.log('  Skipped (exists):')
    for (const f of result.skipped) console.log(`    - ${f}`)
  }
  console.log('\n  Next: edit project.yaml, then run "harness doctor"\n')
})

program.command('index').description('Rebuild knowledge + code index').action(() => {
  console.log('📚 TODO: implement indexing')
})

program.command('task [description]').description('Start a new task').action((desc?: string) => {
  console.log(`📋 TODO: start task "${desc ?? ''}"`)
})

const planCmd = program.command('plan').description('Plan management')
planCmd.command('review').description('Review pending plan').action(() => {
  console.log('📖 TODO: plan review')
})
planCmd.command('approve').description('Approve pending plan').action(() => {
  console.log('✅ TODO: plan approve')
})
planCmd.command('reject [reason]').description('Reject plan').action((reason?: string) => {
  console.log(`❌ TODO: plan reject (${reason ?? 'no reason'})`)
})

program.command('verify').description('Run verification').action(() => {
  console.log('🔍 TODO: verify')
})

program.command('cost').description('Show cost summary').action(() => {
  console.log('💰 TODO: cost')
})

program.parse()
