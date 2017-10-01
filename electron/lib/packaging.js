'use strict'

const pkg = require('../../package.json'),
    paths = require('./paths'),
    moment = require('moment'),
    R = require('ramda'),
    eachSeries = require('async/eachSeries'),
    series = require('async/series'),
    apply = require('async/apply'),
    del = require('del'),
    packager = require('electron-packager'),
    archiver = require('archiver'),
    fs = require('fs'),
    debInstaller = require('electron-installer-debian'),
    rpmInstaller = require('electron-installer-redhat'),
    dmgInstaller = require('electron-installer-dmg'),
    exeInstaller = require('electron-winstaller')

let log = console.log,
    pkgOptions = {}


const appName = pkg.title
const linuxIcon = R.useWith((v) => [v, paths.resources(`linux/${v}.png`)], [(v) => v + 'x' + v])
const linuxInstaller = (installer, done) => {
    const options = {
        src: paths.release(`${appName}-linux-x64`),
        dest: paths.release('installers'),
        options: {
            icon: R.fromPairs(R.map(linuxIcon, [16, 32, 48, 128, 256]))
        },
        productName: appName,
        name: appName,
        bin: appName,
        arch: R.equals(pkgOptions.type, 'deb') ? debArch(pkgOptions.arch) : rpmArch(pkgOptions.arch)
    }
    series([
        apply(installer, options),
        apply(rename, pkgOptions.type, finalName())
    ], done)
}

const findPackage = (types) =>
    fs.readdirSync(paths.release('installers'))
        .filter(file => [].concat(types).indexOf(file.split('.').pop()) !== -1)
        .map(file => paths.release('installers/' + file))
        .sort((f1, f2) => fs.statSync(f2).mtime.getTime() - fs.statSync(f1).mtime.getTime())

const winInstaller = (done) => {
    const options = {
        appDirectory: paths.release(`${appName}-win32-x64`),
        outputDirectory: paths.release('installers'),
        iconUrl: paths.resources('win32/icon.ico'),
        setupIcon: paths.resources('win32/icon.ico'),
        noMsi: true,
        name: appName,
        loadingGif: paths.resources('win32/loading.gif')
    }
    series([
        (done) => del([paths.release('installers/*.exe'), paths.release('installers/*.nupkg')]).then(() => done()),
        (done) => exeInstaller.createWindowsInstaller(options).then(() => done()).catch((e) => done(e.message)),
        apply(eachSeries, ['exe', 'nupkg'], (ext, d) => rename(ext, finalName(ext), d)),
        (done) => {
            let contents = fs.readFileSync(paths.release('installers/RELEASES'), 'utf-8')
            fs.writeFile(paths.release('installers/RELEASES'), R.update(1, finalName('nupkg'), contents.split(' ')).join(' '), done)
        }
    ], done)
}

const darwinInstaller = (done) => {
    const options = {
        appPath: paths.release(`${appName}-darwin-x64/${appName}.app`),
        icon: paths.resources('darwin/icon.icns'),
        'icon-size': 128,
        background: paths.resources('darwin/background.png'),
        name: appName,
        out: paths.release('installers'),
        overwrite: true,
        debug: true,
        contents: [
            {
                x: 500,
                y: 235,
                type: 'link',
                path: '/Applications'
            },
            {
                x: 170,
                y: 235,
                type: 'file',
                path: paths.release(`${appName}-darwin-x64/${appName}.app`)
            }
        ]
    }

    series([
        apply(dmgInstaller, options),
        apply(rename, pkgOptions.type, finalName())
    ], done)
}

const is64 = (t, f) => R.ifElse(R.equals('64'), R.always(t), R.always(f))
const debArch = is64('amd64', 'i386')
const rpmArch = is64('x86_64', 'i386')
const pkgArch = is64('x64', 'ia32')

const rename = (ext, name, done) => {
    log('Renaming an installer file ' + R.head(findPackage(ext)))
    fs.rename(R.when(R.is(Array), R.head)(findPackage(ext)), paths.release(`installers/${name}`), done)
}
const finalName = (ext) => `${pkg.name}-${pkg.version}-${pkgOptions.platform}-x${pkgOptions.arch}.${ext || pkgOptions.type}`
const zipPackage = (options, done) => {
    const output = fs.createWriteStream(paths.release(`installers/${finalName(options.type)}`))
    const archive = archiver(options.type, options)

    output.on('close', done)
    output.on('error', done)

    archive.pipe(output)
    archive.directory(paths.release(`${appName}-${pkgOptions.platform}-x64`), false)
    archive.finalize()
}

const createPkg = (done) => {
    const options = {
        arch: pkgArch(pkgOptions.arch),
        buildVersion: moment().format('YYYYMMDDHHmmss'),
        name: appName,
        overwrite: true,
        osxSign: {
            identity: 'roman.sstu@gmail.com'
        },
        platform: pkgOptions.platform,
        dir: paths.pkg(),
        out: paths.release(),
        icon: paths.resources(`${pkgOptions.platform}/icon`),
        download: {
            cache: paths.release('cache')
        },
        extendInfo: {
            // This option is hiding the dock icon when the app start
            'LSUIElement': 1
        },
        appBundleId: 'ru.romanbelikin.jenia',
        appVersion: pkg.version,
        win32metadata: {
            FileDescription: pkg.description,
            ProductName: pkg.title,
        }
    }

    return packager(options, (err) => {
        if (err) {
            done('An error occured while making a package.' + err.message)
        }
        log('A package have been successful created')
        done()
    })
}


const createInstaller = (done) => {
    log('Creating installer')
    switch (pkgOptions.type) {
        case 'deb':
            series([
                apply(linuxInstaller, debInstaller),
                apply(zipPackage, { type: 'tar', gzip: true})
            ], done)
            break
        case 'rpm':
            linuxInstaller(rpmInstaller, done)
            break
        case 'dmg':
            series([
                darwinInstaller,
                apply(zipPackage, { type: 'zip' })
            ], done)
            break
        case 'exe':
            winInstaller(done)
            break
        default:
            done('Unknow package type ' + pkgOptions.type)
    }
}

const cleanUp = (done) => {
    log('Clean up...')
    del(paths.release(`${appName}*`)).then(() => done()).catch(err => done(err))
}

const createInstallersFolder = (done) => {
    fs.mkdir(paths.release('installers'), (err) => {
        if (err && err.code !== 'EEXIST') done(err)
        done()
    })
}

module.exports = (logger, options, done) => {
    log = logger
    pkgOptions = options

    log(`Start packaging an application to '${pkgOptions.type}' (${pkgOptions.platform}) ... this may take a while, please be patient`)
    series([createInstallersFolder, createPkg, createInstaller, cleanUp], done)
}
