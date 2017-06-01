'use strict'

let gulp = require('gulp'),
    path = require('path'),
    paths = require('./electron/lib/paths'),
    env = require('./electron/lib/env'),
    packaging = require('./electron/lib/packaging'),
    Q = require('q'),
    $ = require('gulp-load-plugins')({ lazy: true }),
    proc = require('child_process'),
    poststylus = require('poststylus'),
    electron = require('electron'),
    source = require('vinyl-source-stream'),
    buffer = require('vinyl-buffer'),
    browserify = require('browserify'),
    watchify = require('watchify'),
    babelify = require('babelify'),
    publish = require('gh-publish'),
    hbsfy = require('hbsfy'),
    nib = require('nib'),
    fs = require('fs'),
    del = require('del')

env.set($.util.env.env || 'development')

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'))
const logger = (logFn, color) => (head, ...tail) => logFn.apply(logFn, [$.util.colors[color](head)].concat(tail))
const yellowLog = logger(console.log, 'yellow')

yellowLog(fs.readFileSync('./greeting', 'utf8'))
yellowLog(`
     App name    : ${pkg.title}
     App version : ${pkg.version}
     Platform    : ${process.platform}
     Env         : ${env.get()}
`)

const bundler = browserify({
    debug: env.dev(),
    entries: ['./app/scripts/app.js'],
    cache: {},
    packageCache: {},
    plugin: env.dev() ? [watchify] : []
})
    .transform(hbsfy)
    .transform(babelify.configure({ presets: ['es2015'] }))


gulp.task('styles', () => {
    return gulp.src(paths.styles('*.styl'))
        .pipe($.stylus({ use: [poststylus('lost'), nib()], 'include css': true }))
        .on('error', function (e) {
            $.util.log(e.message)
            this.emit('end')
        })
        .pipe(gulp.dest(paths.build('styles/')))
        .pipe($.livereload())
})

gulp.task('watch', () => {
    $.livereload.listen()
    return Q.all([
        gulp.watch(paths.styles('**/*.styl'), gulp.series('styles')),
        watchify(bundler).on('update', () =>
            makeBundle(bundler, { sourceMap: true }).pipe(gulp.dest(paths.build())).pipe($.livereload()))
    ])
})

gulp.task('clean', () => {
    return del([
        paths.build(),
        paths.pkg('node_modules')
    ], { force: true })
})

gulp.task('template', () => {
    return gulp.src(paths.app('index.hbs'))
        .pipe($.compileHandlebars({ assets: paths.assets(env), title: pkg.title }))
        .pipe($.rename('index.html'))
        .pipe(gulp.dest(paths.build()))
})

gulp.task('svg', () => {
    return gulp.src(paths.app('svg/*.svg'))
        .pipe($.svgstore())
        .pipe($.rename('sprite.svg'))
        .pipe(gulp.dest(paths.build('images')))
})

gulp.task('lint', () => {
    return gulp.src([
        paths.app('*/**.js'),
        paths.electron('*/**.js'),
        '!' + paths.build('**')
    ])
        .pipe($.eslint())
        .pipe($.eslint.format())
})

// Build task
gulp.task('build', gulp.series('lint', 'clean', gulp.parallel('template', 'styles', 'svg'), () => {
    gulp.src(paths.app('images/**'))
        .pipe(gulp.dest(paths.build('images')))

    gulp.src(paths.cwd('package.json'))
        .pipe(gulp.dest(paths.pkg()))

    gulp.src(paths.app('fonts/**'))
        .pipe(gulp.dest(paths.build('fonts')))

    gulp.src(paths.app('bootstrap.js'))
        .pipe(gulp.dest(paths.build()))

    return makeBundle(bundler, { sourceMap: env.dev(), uglify: env.prod()})
        .pipe(gulp.dest(paths.build()))
}))

gulp.task('pkg-build', () => {
    return gulp.src($.npmFiles(), { base: './' })
        .pipe(gulp.dest(paths.pkg()))
})

gulp.task('pkg', gulp.series('build', 'pkg-build', (done) => {
    let log = (s) => $.util.log($.util.colors.magenta('[Packaging] -> ' + s))
    return packaging(log, {
        type: $.util.env.type,
        platform: $.util.env.platform || process.platform,
        arch: '64'
    }, done)
}))

gulp.task('publish', (done) => {
    const githubToken = $.util.env.token
    if (!githubToken) throw new Error('GitHub token must be set!')

    return publish({
        repo: pkg.name,
        owner: 'roman0x58',
        auth: {
            token: githubToken
        },
        assets: fs.readdirSync(paths.release('installers'))
            .filter((p) => !p.startsWith('.'))
            .map((p) => path.join('release/installers/', p))
    }, done)
})

let makeBundle = function (bundle, { sourceMap = false, uglify = false, fileName = 'build.js' }) {
    let lo = (s) => {
        $.util.log($.util.colors.blue(s))
    }

    lo('[Bundle] -> Bundling es6 application...')

    let stream = bundle.bundle()
        .on('error', $.util.log)
        .pipe(source(fileName))
        .pipe(buffer())

    if (uglify === true) {
        lo('[Bundle] -> Uglifiyng bundle')
        stream.pipe($.uglify({ compress: { drop_console: true }}))
    }

    if (sourceMap === true) {
        lo('[Bundle] -> Creating source map')
        return stream
            .pipe($.sourcemaps.init({ loadMaps: true }))
            .pipe($.sourcemaps.write('./'))
    }
    return stream
}

gulp.task('start', gulp.series('build', gulp.parallel('watch', () => {
    return proc.spawn(electron, ['./electron/main.js'], { stdio: 'inherit' }).on('close', process.exit)
})))