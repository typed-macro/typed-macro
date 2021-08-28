import { getStatement } from '../../testutils'
import {
  ImportOption,
  matchImportStmt,
  renderImportStmt,
} from '@/core/helper/import'
import { ImportDeclaration } from '@babel/types'

describe('matchImportStmt()', () => {
  it('should work with loose=true', () => {
    const stmt = getStatement(
      `import { a as _a } from 'a'`
    ) as ImportDeclaration
    const testCases: { option: ImportOption; match: boolean }[] = [
      { option: { moduleName: 'a' }, match: true } /* loose */,
      { option: { moduleName: 'b' }, match: false },
      { option: { moduleName: 'a', exportName: 'a' }, match: true } /* loose */,
      {
        option: { moduleName: 'a', exportName: 'a', localName: 'a' },
        match: false,
      },
      {
        option: { moduleName: 'a', exportName: 'a', localName: '_a' },
        match: true,
      },
      { option: { moduleName: 'a', defaultName: 'a' }, match: false },
      { option: { moduleName: 'a', namespaceName: 'a' }, match: false },
    ]
    testCases.forEach((c) =>
      expect(matchImportStmt(c.option, stmt, true /* loose */)).toBe(c.match)
    )
  })

  it('should work with loose=false', () => {
    {
      const stmt = getStatement(
        `import { a as _a } from 'a'`
      ) as ImportDeclaration
      const testCases: { option: ImportOption; match: boolean }[] = [
        { option: { moduleName: 'a' }, match: false },
        { option: { moduleName: 'b' }, match: false },
        { option: { moduleName: 'a', exportName: 'a' }, match: false },
        {
          option: { moduleName: 'a', exportName: 'a', localName: 'a' },
          match: false,
        },
        {
          option: { moduleName: 'a', exportName: 'a', localName: '_a' },
          match: true,
        },
        { option: { moduleName: 'a', defaultName: 'a' }, match: false },
        { option: { moduleName: 'a', namespaceName: 'a' }, match: false },
      ]
      testCases.forEach((c) =>
        expect(matchImportStmt(c.option, stmt, false /* loose */)).toBe(c.match)
      )
    }
    {
      const stmt = getStatement(`import { a } from 'a'`) as ImportDeclaration
      const testCases: { option: ImportOption; match: boolean }[] = [
        { option: { moduleName: 'a', exportName: 'a' }, match: true },
        {
          option: {
            moduleName: 'a',
            exportName: 'a',
            localName: 'a',
          } /* it's equal to { moduleName: 'a', exportName: 'a' } */,
          match: true,
        },
        {
          option: { moduleName: 'a', exportName: 'a', localName: '_a' },
          match: false,
        },
        { option: { moduleName: 'a', defaultName: 'a' }, match: false },
        { option: { moduleName: 'a', namespaceName: 'a' }, match: false },
      ]
      testCases.forEach((c) =>
        expect(matchImportStmt(c.option, stmt, false /* loose */)).toBe(c.match)
      )
    }
    {
      const stmt = getStatement(`import * as a from 'a'`) as ImportDeclaration
      expect(
        matchImportStmt(
          { moduleName: 'a', namespaceName: 'a' },
          stmt,
          false /* loose */
        )
      ).toBe(true)
      expect(
        matchImportStmt(
          { moduleName: 'a', defaultName: 'a' },
          stmt,
          false /* loose */
        )
      ).toBe(false)
    }
    {
      const stmt = getStatement(`import a from 'a'`) as ImportDeclaration
      expect(
        matchImportStmt(
          { moduleName: 'a', defaultName: 'a' },
          stmt,
          false /* loose */
        )
      ).toBe(true)
      expect(
        matchImportStmt(
          { moduleName: 'a', namespaceName: 'a' },
          stmt,
          false /* loose */
        )
      ).toBe(false)
    }
  })
})

describe('renderImportStmt()', () => {
  it('should render code properly', () => {
    const testCases: ImportOption[] = [
      { moduleName: 'a' },
      { moduleName: 'a', exportName: 'a' },
      { moduleName: 'a', exportName: 'a', localName: '_a' },
      { moduleName: 'a', defaultName: 'a' },
      { moduleName: 'a', namespaceName: 'a' },
    ]
    testCases.forEach((c) => expect(renderImportStmt(c)).toMatchSnapshot())
  })
})
