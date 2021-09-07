# Branch name policy enforcer

Allows control of what branch names are used within a project repo.

## Description

This action will enforce prefixes structure, prefixes names and branch names as specified for the project repo. Non-compliant branches will be deleted from the repo during the 'create' event.
GitHub will send a notification email to the contributor that created non compliant branch, as long as he/she did not turn off notifications for the repo.

## Using the action

### Inputs
* __github_token__ - GitHub authentication token, can be passed in as '${{ secrets.GITHUB_TOKEN }}'. Make sure to add write permission to content!
    * required: true

* __ignore_branches__ - semicolon separated list of branch names to ignore (master;release). These branches are expected to be without prefixes!
    * default: "main;master;teamshare;product_teamshare"
    * required: false

* __regex__ - Semicolon separated list of Regex patterns to validate the branch name against
    * required: true

* __delete_branch__ - Flag that indicates if invalid branch should be deleted. IF set to false - action will exit with an error (failing an action check in the repo), but branch will stay.
    * required: true

### Usage Examples
#### Example 1:
```
name: "Branch name enforcer"

on:
  create:

jobs:
  validate_branch_name:
    name: validate_branch_name
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - name: run-enforcer
        uses: jci-internal/int-dsc-fusion-action-branch-name-enforcer@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          ignore_branches: "master;main;teamshare;product_teamshare"
          regex: "^([A-Z0-9]*/)((teamshare)|(feature/[A-Z]*-[0-9]*)|(release/[0-9]{1,2}.[0-9]{1,2}.[0-9]{1,5}$))"
          delete_branch: "true"
```
#### Example 2:
```
name: "Branch name enforcer"

on:
  create:

jobs:
  validate_branch_name:
    name: validate_branch_name
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - name: run-enforcer
        uses: jci-internal/int-dsc-fusion-action-branch-name-enforcer@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          ignore_branches: "master;main;teamshare;product_teamshare"
          regex: "^([A-Z0-9]*/)(teamshare);^([A-Z0-9]*/)(feature/[A-Z]*-[0-9]*[-_A-Za-z0-9]*);^([A-Z0-9]*/)(release/[0-9]{1,2}.[0-9]{1,2}.[0-9]{1,5}$)"
          delete_branch: "true"
```
Both of these examples would enforce following:

  * Valid:
  ```
  NEO-PROJECT/teamshare
  NEO-PROJECT/feature/SDO-123456
  NEO-PROJECT/feature/XXO-1
  NEO-PROJECT/release/2.0.0
  NEO-PROJECT/release/1.0.1

  IQ2/teamshare
  IQ2/feature/SDO-123456
  IQ2/feature/XXO-1
  IQ2/release/2.0.01234
  IQ2/release/1.0.1

  IQ4/teamshare
  IQ4/feature/SDO-123456_test
  IQ4/feature/SDO-123456-test
  IQ4/feature/SDO-123456_test
  IQ4/feature/XXO-1
  IQ4/release/2.0.0
  IQ4/release/1.0.1

  IQ9/teamshare
  IQ9/feature/SDO-123456
  IQ9/feature/XXO-1
  ```

  * Invalid:
  ```
  test_prefix/NEO-PROJECT/teamshare
  neo-project/teamshare
  iq9/teamshare
  IQ9/teamshare-random-suffix
  IQ4/feature/SDO123456
  IQ9/release/01.02.12345-random-suffix
  ```
