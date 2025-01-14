import * as artifact from '@actions/artifact'
import * as cache from '@actions/cache'
import * as core from '@actions/core'
import * as fs from 'fs'
import * as path from 'path'

import { getCacheDir, getCacheKeys, getEnvVar, printStats } from './lib'

async function save(): Promise<void> {
  const { unique } = getCacheKeys()

  const cacheDir = await getCacheDir()
  const paths = [cacheDir]

  core.info(`buildcache: saving cache with key "${unique}".`)
  try {
    await cache.saveCache(paths, unique)
  } catch (e) {
    core.warning(`buildcache: caching not working: ${e}`)
  }
}

async function uploadBuildLog(): Promise<void> {
  const artifactClient = artifact.create()
  const artifactName = 'buildcache_log'

  const cacheDir = await getCacheDir()
  const logFile = path.resolve(
    cacheDir,
    getEnvVar('BUILDCACHE_LOG_FILE', 'buildcache.log')
  )
  const files = [logFile]
  // FIXME this won't strip the leading directories off custom log file locations correctly!
  // It still has the built in assumption that the log file is located inside the cache directory
  const rootDirectory = cacheDir
  const options = {
    continueOnError: false
  }

  const uploadFlag = core.getInput('upload_buildcache_log')
  if (uploadFlag && uploadFlag === 'true') {
    try {
      const uploadResponse = await artifactClient.uploadArtifact(
        artifactName,
        files,
        rootDirectory,
        options
      )
      core.info(
        `buildcache: uploaded buildcache.log file (consumed ${uploadResponse.size} bytes of artifact storage)`
      )
    } catch (e) {
      core.warning(`buildcache: unable to upload buildlog: ${e}`)
    }
  }
  try {
    await fs.promises.unlink(logFile)
  } catch (e) {
    core.warning(`buildcache: unable to delete buildcache.log ${e}`)
  }
}

async function run(): Promise<void> {
  await printStats()
  await uploadBuildLog()
  await save()
}

run()

export default run
