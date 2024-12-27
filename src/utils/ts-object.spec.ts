import tsObject from "./ts-object";
import { instructionsToString } from "../test-utils/ts-to-string";

describe('TS Object', () => {
  it('correctly returns a single deep object', () => {
    const result = tsObject({
      test: 'test1',
      test2: 1001,
      test3: true,
    }, 'UnitTest');

    expect(instructionsToString(result)).toEqual(`interface UnitTest { test: string; test2: number; test3: boolean; }`);
  });

  it('correctly returns returns for 2 level object', () => {
    const result = tsObject({
      test: {
        test2: 1001,
        test3: true,
      }
    }, 'UnitTest');

    expect(instructionsToString(result)).toEqual(`interface UnitTestTest { test2: number; test3: boolean; } interface UnitTest { test: UnitTestTest; }`);
  });
  
  it('correctly returns returns for 3 level object', () => {
    const result = tsObject({
      test: {
        test2: 1001,
        test3: {
          test4: true,
        }
      }
    }, 'UnitTest');

    expect(instructionsToString(result)).toEqual(`interface UnitTestTestTest3 { test4: boolean; } interface UnitTestTest { test2: number; test3: UnitTestTestTest3; } interface UnitTest { test: UnitTestTest; }`);
  });

  it('correctly handles an unsupported type', () => {
    const result = tsObject({
      test: () => {},
    }, 'UnitTest');

    expect(instructionsToString(result)).toEqual(`interface UnitTest { test: unknown; }`);
  });
});
