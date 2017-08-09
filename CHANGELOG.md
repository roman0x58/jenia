# Jenia Change log
## [0.2.0] - 2017-08-09
### Added
    - Notifications for succeded/aborted/failed builds (desktop notification will be implemented in the future)
    - Additional information on the build page such as a build parameters, git affected paths, commit date
    - Now the all git commits will be shown show on a changes tab
    - Some ui/ux improvements
    - Added `loglevel` lib as an application logging system
### Fixed
    - Refactored the application background refresh task
## [0.1.2] - 2017-05-28
### Added
    - Refresh the application when it has been shown from background
### Fixed
    - A build with empty params
## [0.1.1] - 2017-05-28
### Fixed
    - Type error when a job lastSuccessfulBuild doesn't exist
### Changed
    - Reset server auto sign in if was a failure attempt
    - Some text corrections and fixes
## [0.1.0] - 2017-05-14
### Added
    - Request ETAG header support in order to avoid limitations of GitHub API
    - Last successful build time in jobs view
    - Application auto update
    - Uglify bundle
### Fixed
    - Queue cancelation error message 
    - Console output freezing
## [0.0.1] - 2017-04-28
    -The version when application was born!🔥