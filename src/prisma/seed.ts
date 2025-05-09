import { PrismaClient } from '@prisma/client'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as path from 'path'
import * as fs from 'fs'

const execAsync = promisify(exec)
const prisma = new PrismaClient()

async function executeSqlFile(filePath: string) {
  const absolutePath = path.resolve(__dirname, 'scripts', filePath)
  const sql = fs.readFileSync(absolutePath, 'utf8')
  
  // Split the SQL file into individual statements
  const statements = sql
    .split(';')
    .map(statement => statement.trim())
    .filter(statement => statement.length > 0)
  
  try {
    // Execute each statement separately
    for (const statement of statements) {
      // Format the SQL statement
      const formattedStatement = statement
        .replace(/INSERT INTO (.*?) \((.*?)\) VALUES \((.*?)\)/g, (match, table, columns, values) => {
          const columnList = columns.split(',').map(col => col.trim()).join(',\n    ')
          const valueList = values.split(',').map(val => val.trim()).join(',\n    ')
          return `INSERT INTO ${table} (\n    ${columnList}\n) VALUES (\n    ${valueList}\n)`
        })
        .replace(/ON CONFLICT.*$/, match => `\n${match}`)

      // Only add ON CONFLICT if the statement doesn't already have one
      const modifiedStatement = formattedStatement.includes('ON CONFLICT') 
        ? formattedStatement 
        : formattedStatement + '\nON CONFLICT (id) DO NOTHING'

      await prisma.$executeRawUnsafe(modifiedStatement)
    }
    console.log(`Successfully executed ${filePath}`)
  } catch (error) {
    console.error(`Error executing ${filePath}:`, error)
    throw error
  }
}

async function main() {
  try {
    // Execute SQL files in order
    await executeSqlFile('country-insert-script.sql')
    await executeSqlFile('insert_dailycheck_countries.sql')
    await executeSqlFile('insert_school.sql')
    
    console.log('Database seeding completed successfully')
  } catch (error) {
    console.error('Error seeding database:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main() 
