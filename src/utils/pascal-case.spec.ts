import pascalCase from "./pascal-case";

describe('Pascal Case', () => {
  it('correctly returns', () => {
    const str = 'Super/Duper-Unit test';

    expect(pascalCase(str)).toEqual('SuperDuperUnitTest');
  });
});
