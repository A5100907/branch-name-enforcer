const core = require("@actions/core")
const github = require("@actions/github")

async function main() {
    // take parameters from a caller
    const token = core.getInput("github_token")
    const octokit = github.getOctokit(token)
    const ignore_branches = core.getInput("ignore_branches").split(";")
    const regex_patterns = core.getInput("regex").split(";")
    const delete_branch = core.getInput("delete_branch")

    try {
        // if any of the checks not passing, branch will be set to not valid
        let branch_is_valid = true

        core.debug("Running 'main()' ...")
        core.debug(`ignore_branches=${ignore_branches}`)
        core.debug(`regex_patterns=${regex_patterns}`)
        core.debug(`delete_branch=${delete_branch}`)
        logSeparator()

        // checks the event that triggered the execution
        if (!checkEvent(github.context)) {
            core.info(`Non 'branch' event detected. Exiting gracefully ... `)
            return
        }

        logSeparator()
        logMinimizer("Event context data",github.context)
        logMinimizer("context.repo", github.context.repo)
        const branch_ref = getBranchRef(github.context)
        const branch_name = getBranchName(branch_ref)
        
        logSeparator()
        // checks if branch is in ignore list
        if (ignoreThisBranch(ignore_branches, branch_name)) {
            core.info(`Current branch matches ignore condition. Skipping enforcement. Exiting gracefully ...`)
            return
        }

        logSeparator()
        if (isBranchNameValid(regex_patterns, branch_name)) {
            core.info("Branch passes all check. Exiting gracefully ...")
            return
        } else {
            core.error("Branch did not pass regex validation!")
            branch_is_valid = false
        }
        

        logSeparator()
        // technically, there is no need for this flag, since app would exit at this point if branch is valid, it only get here if branch is invalid
        // this is more to have a structure for extra features in the future
        if (!branch_is_valid){
            if (delete_branch === "true" ) {
                // acquire information needed for a call to delete the branch
                const branch_ref = getBranchRef(github.context)
                const repo_name = getRepoName(github.context)
                const repo_owner = getOwnerName(github.context)
                // api call is async, so need to wait for a result
                await deleteBranch(repo_owner, repo_name, branch_ref, octokit)
                core.warning("Branch is deleted!")
            }
            else {
                core.warning("Branch is not deleted!")
            }
            throw new Error("Branch did not pass naming rules policy!")
        }
        
        throw new Error("Something went wrong, action should not reach this block!!!")
    } catch (error) {
        core.warning(`Branch name: ${github.context.payload.ref}`)
        core.setFailed(`Action failed. ${error}`)
    }
}

async function deleteBranch(owner, repo, ref, octokit) {
    // delete specified branch
    let branch_path = ref.replace("refs/", "")
    core.debug("Running 'deleteBranch()' ...")
    core.warning(`Deleting a branch: ${owner}/${repo}/${branch_path}`)
    try {
        await octokit.rest.git.deleteRef({
            owner: owner,
            repo: repo,
            ref: branch_path
        })

        return true
    } catch (error) {
        core.error(error)
        throw new Error("Failed during branch deletion!")
    }
}

function isBranchNameValid(regexes, branch_name) {
    // Validates a branch against a list of regex patterns
    // Need to match at least one pattern to be valid branch name
    core.debug("Running 'isBranchNameValid()' ...")
    let branch_is_valid = false
    try {
        regexes.forEach(pattern => {
            core.info(`Validating '${branch_name}' against '${pattern}'`)
            const regex = RegExp(pattern)
            if (regex.test(branch_name)) {
                core.info("Match.")
                branch_is_valid = true
            } else {
                core.info("Not a match.")
            }
        })

        if (branch_is_valid) {
            core.info("Branched matched at least one pattern.")
            core.info("Branched name is valid.")
            return true
        }
        core.warning("Branch did not match against any of the allowed regex patterns.")
        core.warning("Please refer to the branch naming policy for your project.")
        return false
    } catch (error) {
        core.error(error)
        core.error("Something went wrong in regex pattern validation!")
        core.error("Contact Fusion DevOps team <fusion_devops@johnsoncontrols365.onmicrosoft.com>")
        throw new Error("isBranchNameValid() failed.")
    }
}

function ignoreThisBranch(ignores, branch_name) {
    // Check if current branch should be ignored
    core.debug("Running 'ignoreThisBranch()' ...")
    const branch = branch_name
    core.info(`Branches that should be ignored: ${ignores}`)
    if (ignores.indexOf(branch) > (-1)){
        core.info("Current branch is in ignore list.")
        return true
    }
    core.info("Current branch is not in ignore list.")
    return false
}

function getBranchRef(context) {
    // return the full 'ref' value of a branch
    core.debug("Running 'getBranchRef()' ...")
    try {
        let branch_ref = context.ref.trim()
        core.info(`branch_ref=${branch_ref}`)
        return branch_ref
    } catch (error) {
        core.error(error)
        throw new Error(`Something went wrong with getting branch's ref!`)
    }
}

function getBranchName(branch_ref) {
    // extracts user friendly branch name out of a branch ref value
    core.debug("Running 'getBranchName()' ...")
    try {
        let branch_name_arr = branch_ref.split("refs/heads/")
        let branch_name = branch_name_arr[branch_name_arr.length - 1]
        core.info(`branch_name=${branch_name}`)
        return branch_name
    } catch (error) {
        core.error(error)
        throw new Error(`Something went wrong with extracting branch's name out of ref!`)
    }
}

function getRepoName(context) {
    // return the repo name
    core.debug("Running 'getRepo()' ...")
    try {
        let repo_name = context.repo.repo.trim()
        core.info(`repo_name=${repo_name}`)
        return repo_name
    } catch (error) {
        core.error(error)
        throw new Error(`Something went wrong with getting repo name!`)
    }
}

function getOwnerName(context) {
    // return the repo owner
    core.debug("Running 'getOwnerName()' ...")
    try {
        let owner_name = context.repo.owner.trim()
        core.info(`owner_name=${owner_name}`)
        return owner_name
    } catch (error) {
        core.error(error)
        throw new Error(`Something went wrong with getting repo owner!`)
    }
}

function checkEvent(context) {
    // Check a github event that triggered the action
    // Expected event is 'create' 'branch'
    // return true if matched, false if event is 'create', but not 'branch'
    // terminate with error if event is not 'create'
    core.debug("Running 'checkEvent()' ...")
    
    if(context.eventName === "create") {
        core.info(`eventName='${context.eventName}' and eventType='${context.payload.ref_type}'`)
        
        if (context.payload.ref_type === "branch") {
            core.info("Valid event for execution.")
            return true
        } else {
            core.info("This is not the event we are looking for.")
            return false
        }
    }
    core.warning(`eventName='${context.eventName}' and eventType='${context.payload.ref_type}'`)
    core.warning(`This GitHub action is designed to only run on 'create' 'branch' event!`)
    core.warning(`Make sure to adjust GitHub action event triggers!`)
    throw new Error(`Invalid event!`)
}

function logMinimizer(title, text_to_print) {
    // prints into a log with ability to maximize/minimize entry
    core.startGroup(title)
    console.log(text_to_print)
    core.endGroup()
}

function logSeparator() {
    core.info("=".repeat(80))
}

main()
