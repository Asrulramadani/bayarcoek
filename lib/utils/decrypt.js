const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const crypto = require('crypto');
const zlib = require('zlib');

const algorithm = 'aes-256-ctr';

module.exports = (_path, secretKey, overwrite) => {
  let key = process.env.BAYARCOEK_KEY || secretKey;
  key = crypto
    .createHash('sha256')
    .update(String(key))
    .digest('base64')
    .substr(0, 32);

  const decrypt = (file) => {
    const readInitVect = fs.createReadStream(file, {
      end: 15,
    });

    let initVect;
    readInitVect.on('data', (chunk) => {
      initVect = chunk;
    });

    readInitVect.on('close', async () => {
      const readStream = fs.createReadStream(file, {
        start: 16,
      });
      const decipher = crypto.createDecipheriv(algorithm, key, initVect);
      const unzip = zlib.createUnzip();
      const writeStream = fs.createWriteStream(
        path.parse(file).dir + '/' + path.parse(file).name
      );
      await readStream.pipe(decipher).pipe(unzip).pipe(writeStream);
      if (overwrite) {
        fs.unlink(file, () => {});
      }
      console.log(
        `${chalk.green.bold(path.parse(file).base)} has been Decrypted!`
      );
    });
  };

  const main = (_path) => {
    const whitelist = ['bayarcoek.js', 'node_modules'];
    let files = fs.statSync(_path);
    if (files.isFile()) {
      decrypt(_path);
    } else {
      files = fs
        .readdirSync(_path)
        .filter(
          (file) => !/(^|\/)\.[^]/g.test(file) && !whitelist.includes(file)
        );
      files.forEach((file) => {
        let oldPath, newPath;
        // const x = _path == '' ? '/' : `/${_path}/`;
        oldPath = path.join(_path, file);
        newPath = path.parse(oldPath).dir + '/' + path.parse(oldPath).name;
        const item = fs.statSync(oldPath);
        if (item.isDirectory()) {
          fs.renameSync(oldPath, newPath);
          return main(newPath);
        }
        decrypt(oldPath);
      });
    }
  };
  main(process.cwd() + '/' + _path);
};
