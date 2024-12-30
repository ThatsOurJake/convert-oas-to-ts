import { instructionsToString, propertyToString } from "../test-utils/ts-to-string";
import tsArray from "./ts-array";

describe('TS Array', () => {
  it('returns correct for simple array', () => {
    const arr = ['super', 'duper'];
    const output = tsArray('unitTest', arr);
    
    expect(propertyToString(output.property)).toEqual(`unitTest: string[];`);
    expect(instructionsToString(output.interfaces)).toEqual('');
  });

  it('returns correct for multi type array', () => {
    const arr = ['super', 1001, false];
    const output = tsArray('unitTest', arr);

    expect(propertyToString(output.property)).toEqual(`unitTest: (string | number | boolean)[];`);
    expect(instructionsToString(output.interfaces)).toEqual('');
  });

  it('returns correct for object array', () => {
    const arr = [{
      test: 'hello',
      test2: 1001,
    }];

    const output = tsArray('unitTest', arr);

    expect(propertyToString(output.property)).toEqual(`unitTest: UnitTestArr[];`);
    expect(instructionsToString(output.interfaces)).toEqual(`interface UnitTestArr { test: string; test2: number; }`);
  });

  it('returns correct for multi object array', () => {
    const arr = [{
      test: 'hello',
      test2: 1001,
    }, {
      test: 'hello',
      test3: true,
    }];

    const output = tsArray('unitTest', arr);

    expect(propertyToString(output.property)).toEqual(`unitTest: (UnitTestArr0 | UnitTestArr1)[];`);
    expect(instructionsToString(output.interfaces)).toEqual(`interface UnitTestArr0 { test: string; test2: number; } interface UnitTestArr1 { test: string; test3: boolean; }`);
  });

  it('returns correct for multi object array with nested object', () => {
    const arr = [{
      test: 'hello',
      test2: 1001,
      test3: {
        test4: true,
      }
    }, {
      test: 'hello',
      test3: true,
    }];

    const output = tsArray('unitTest', arr);

    expect(propertyToString(output.property)).toEqual(`unitTest: (UnitTestArr0 | UnitTestArr1)[];`);
    expect(instructionsToString(output.interfaces)).toEqual(`interface UnitTestArr0Test3 { test4: boolean; } interface UnitTestArr0 { test: string; test2: number; test3: UnitTestArr0Test3; } interface UnitTestArr1 { test: string; test3: boolean; }`);
  });
});
