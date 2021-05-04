# Accelerate builds using buildcache

Use this GitHub Action to accelerate compilation in your GitHub workflows using [buildcache](https://github.com/mbitsnbites/buildcache)

## Usage

1. Include the action in your workflow:

```yaml
- name: buildcache
- uses: mikehardy/buildcache-action@v1
```

2. Use the `clang` and `clang++` from `$PATH` now, not fully-specified paths. This is portable as a _normal_ Xcode installation will place `clang` and `clang++` wrappers in `/usr/bin` so the same command will work for normal compilation or in CI.

You may specify the compiler like this for Xcode builds: `xcodebuild CC=clang CPLUSPLUS=clang++ LD=clang LDPLUSPLUS=clang++ -workspace demo/ios/demo.xcworkspace -scheme demo -configuration Debug -sdk iphonesimulator -derivedDataPath demo/ios/build -UseModernBuildSystem=YES`

You might also alter your project settings to use the non-qualified compiler names by default with a `Podfile` section like so:

```ruby
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings["CC"] = "clang"
        config.build_settings["LD"] = "clang"
        config.build_settings["CXX"] = "clang++"
        config.build_settings["LDPLUSPLUS"] = "clang++"
      end
    end

```

## Benchmarks

iOS compile performance improvements of approximately 40-50% may be expected when using this action

- macos-latest hosted runner, warm cache, react-native-firebase app with all modules: 5min 52s (vs 10min)
- macos-latest hosted runner, warm cache, react-native 0.64 demo app without Flipper: 2min 55s (vs 5min 20s)

The _first_ build / "cold" cache case will be slower by around 15%, since buildcache does work to determine if it can used the cached object or not. On the cache miss case it then delegates to the compiler and stores the object for the next run.

## Approach

This action does these things - if they interact poorly with your project, perhaps they could be altered slightly and made to work better if you propose a PR:

- fetches the latest version of [buildcache](https://github.com/mbitsnbites/buildcache)
- installs it in your project directory as `buiildcache/bin/buildcache`
- makes symoblic links from `buildcache` to `clang` and `clang++`
- adds that directory to your `$GITHUB_PATH` for future steps
- configures the cache for the directory `.buildcache` in your project directory
- configures buildcache for 500MB of cache storage
- restores previous caches, and at the end saves the current one

## Things that don't work

- Direct mode did not work in testing when compiling react-native apps. Dependency files aren't created, but are needed. Direct mode is not enabled.
- `ccache` did not work when compiling react-native apps. It can't handle "multiple source files" so cache misses all the time.
- copying `buildcache` to `clang` and `clang++`, it has to be symbolic links. This means this is not quite a drop-in replacement on windows

## Contributing

If you set up a personal access token on GitHub, then export it as well as a couple other items, the whole thing runs well from a local mac for development.

```bash
alias buildcache-action-exports='export GITHUB_TOKEN=PERSONALACCESSTOKENHERE; export RUNNER_TEMP=`pwd`/__tests__/runner/TEMP; export RUNNER_CACHE=`pwd`/__tests__/runner/CACHE; export GITHUB_WORKSPACE=`pwd`/__tests__/runner/WORKSPACE'
```

I usually have two terminals open side by side, one with `yarn build-watch` and one to run `yarn test`

PRs are welcome. This action is new and is in the "works for me" and "works for react-native-firebase" state, so it _is_ useful, but maybe not generic enough to be useful for others yet.

## Inspiration

I work on [react-native-firebase](https://github.com/invertase/react-native-firebase) and [FlutterFire](https://github.com/FirebaseExtended/flutterfire/) for [Invertase](https://invertase.io) and they have a truly inspiring dedication to automated testing. I sincerely love it, but...CI is slow for iOS testing!

I was originally inspired to try speeding up iOS compiles after seeing [Codified](https://getcodified.com/services/) applying ccache with 10-20% improvements to CI Xcode builds, but it wasn't packaged up or redistributable

I really wanted to use [ccache-action](https://github.com/hendrikmuhs/ccache-action) - Henrik has done a great job there. Unfortunately in my testing with react-native projets ccache had very poor performance vs buildcache owing to the "multiple_source_files" cache misses. `ccache-action` was the inspiration for this action though, thanks Hendrik!

Combining the motivation to try it, the template of the idea already existing with ccache, and the good performance of buildcache and here we are.
