import file from './file.service';
const fs = require('fs');

describe('file service', () => {
  it('should have file operation methods', () => {
    expect(file).toHaveProperty('exists');
    expect(file).toHaveProperty('create');
    expect(file).toHaveProperty('read');
    expect(file).toHaveProperty('update');
    expect(file).toHaveProperty('delete');
    expect(file).toHaveProperty('move');
    expect(file).toHaveProperty('readDirectory');
    expect(file).toHaveProperty('createDirectory');
    expect(file).toHaveProperty('deleteDirectory');
    expect(file).toHaveProperty('getDirectorySize');
  });

  // Add more tests with mocks for fs

  it('should create a file', async () => {

    const path = './test-file.txt';
    const content = 'Hello, world!';

    // Mock fs.promises.writeFile
    jest.spyOn(fs.promises, 'writeFile').mockResolvedValue(undefined);

    const result = await file.create(path, content);
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(Array.isArray(result.messages)).toBe(true);
    expect(fs.promises.writeFile).toHaveBeenCalledWith(expect.stringContaining(path), content);
    fs.promises.writeFile.mockRestore();
    
  });

  it('should read a file', async () => {
    const path = './test-file.txt';
    const fileContent = 'Hello, world!';

    // Mock fs.promises.readFile
    jest.spyOn(fs.promises, 'readFile').mockResolvedValue(fileContent);

    const result = await file.read(path);
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.body).toBe(fileContent);
    expect(fs.promises.readFile).toHaveBeenCalledWith(expect.stringContaining(path), 'utf8');
    fs.promises.readFile.mockRestore();
  });

  it('should update a file', async () => {
    const path = './test-file.txt';
    const newContent = 'Updated content';

    // Mock fs.promises.appendFile
    jest.spyOn(fs.promises, 'appendFile').mockResolvedValue(undefined);

    const result = await file.update(path, newContent);
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(Array.isArray(result.messages)).toBe(true);
    // Safer: check that the mock was called before destructuring
    expect(fs.promises.appendFile.mock.calls.length).toBeGreaterThan(0);
    const callArgs = fs.promises.appendFile.mock.calls[0];
    expect(callArgs[0]).toEqual(expect.stringContaining(path));
    expect(callArgs[1]).toBe(newContent);
    fs.promises.appendFile.mockRestore();
  });

  it('should delete a file', async () => {
    const path = './test-file.txt';

    // Mock fs.promises.rm
    jest.spyOn(fs.promises, 'rm').mockResolvedValue(undefined);

    const result = await file.delete(path);
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(Array.isArray(result.messages)).toBe(true);
    expect(fs.promises.rm.mock.calls.length).toBeGreaterThan(0);
    const callArgs = fs.promises.rm.mock.calls[0];
    expect(callArgs[0]).toEqual(expect.stringContaining(path.slice(1)));
    // Assert options if present
    if (callArgs.length > 1) {
      expect(callArgs[1]).toMatchObject({ recursive: true, force: true });
    }
    fs.promises.rm.mockRestore();
  });

  it('should read a directory', async () => {
    const path = './test-directory';
    const dirContents = ['file1.txt', 'file2.txt'];

    // Mock fs.promises.readdir
    jest.spyOn(fs.promises, 'readdir').mockResolvedValue(dirContents);

    const result = await file.readDirectory(path);
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(Array.isArray(result.body)).toBe(true);
    expect(result.body).toEqual(dirContents);
    expect(fs.promises.readdir).toHaveBeenCalledWith(expect.stringContaining(path));
    fs.promises.readdir.mockRestore();
  });

});
