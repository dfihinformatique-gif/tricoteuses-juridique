import nodegit from "nodegit"

export type Origine = (typeof origines)[number]
export type OrigineEtendue = (typeof originesEtendues)[number]

export const dilaDateRegExp = /20\d\d[01]\d[0-3]\d-([0-6]\d){3}/
export const origines = ["JORF", "LEGI"] as const
export const originesEtendues = [
  ...origines,
  "LIENS_INVERSES_DONNEES_JURIDIQUES",
] as const

export async function* iterCommitsOids(
  repository: nodegit.Repository,
  reverse: boolean,
): AsyncGenerator<nodegit.Oid, void> {
  const revisionWalker = repository.createRevWalk()
  revisionWalker.pushHead()
  if (reverse) {
    revisionWalker.sorting(nodegit.Revwalk.SORT.REVERSE)
  }
  while (true) {
    try {
      const commitOid = await revisionWalker.next()
      yield commitOid
    } catch (err) {
      if (
        (err as Error)?.message.includes("Method next has thrown an error.")
      ) {
        break
      }
      throw err
    }
  }
}

export async function* iterSourceCommitsWithSameDilaDate(
  repositoryByOrigine: Record<OrigineEtendue, nodegit.Repository>,
  reverse: boolean,
): AsyncGenerator<
  {
    dilaDate: string
    sourceCommitByOrigine: Record<OrigineEtendue, nodegit.Commit>
  },
  void
> {
  // When reverse is false, the first commit is the most recent one.
  // When reverse is true, the first commit is the latest one.
  const commitsOidsIteratorByOrigine = Object.fromEntries(
    Object.entries(repositoryByOrigine).map(([origine, repository]) => [
      origine,
      iterCommitsOids(repository, reverse),
    ]),
  )
  iterCommitsWithSameDilaDate: while (true) {
    const commitOrNullByOrigine: Record<string, nodegit.Commit | null> =
      Object.fromEntries(
        await Promise.all(
          Object.entries(commitsOidsIteratorByOrigine).map(
            async ([origine, commitsOidsIterator]) => {
              const { done, value } = await commitsOidsIterator.next()
              if (done) {
                return [origine, null]
              }
              return [
                origine,
                await repositoryByOrigine[origine as OrigineEtendue].getCommit(
                  value as nodegit.Oid,
                ),
              ]
            },
          ),
        ),
      )
    if (
      Object.values(commitOrNullByOrigine).some((commit) => commit === null)
    ) {
      return
    }
    const commitByOrigine = commitOrNullByOrigine as Record<
      OrigineEtendue,
      nodegit.Commit
    >
    const commitDilaDateByOrigine = Object.fromEntries(
      Object.entries(commitByOrigine).map(([origine, commit]) => {
        const message = commit.message()
        const dilaDate = message.match(dilaDateRegExp)?.[0] ?? null
        return [origine, dilaDate]
      }),
    )
    let dilaDateGoal = Object.values(commitDilaDateByOrigine).reduce(
      (dilaDateGoal, commitDilaDate) =>
        commitDilaDate === null
          ? dilaDateGoal
          : dilaDateGoal === null
            ? commitDilaDate
            : reverse
              ? commitDilaDate > dilaDateGoal
                ? commitDilaDate
                : dilaDateGoal
              : commitDilaDate < dilaDateGoal
                ? commitDilaDate
                : dilaDateGoal,
      null,
    )
    if (dilaDateGoal === null) {
      continue iterCommitsWithSameDilaDate
    }

    // Iterate commits until each origin has the same commit date as the others.
    tryNextDilaDate: while (true) {
      for (const origineAndCommitTuple of Object.entries(commitByOrigine)) {
        const origine = origineAndCommitTuple[0]
        let commit = origineAndCommitTuple[1]
        let commitDilaDate = commitDilaDateByOrigine[origine]
        while (
          commitDilaDate === null ||
          (reverse
            ? commitDilaDate < dilaDateGoal
            : commitDilaDate > dilaDateGoal)
        ) {
          const { done, value } =
            await commitsOidsIteratorByOrigine[origine].next()
          if (done) {
            return
          }
          commitByOrigine[origine as OrigineEtendue] = commit =
            await repositoryByOrigine[origine as OrigineEtendue].getCommit(
              value as nodegit.Oid,
            )
          const message = commit.message()
          commitDilaDateByOrigine[origine] = commitDilaDate =
            message.match(dilaDateRegExp)?.[0] ?? null
        }
        if (commitDilaDate !== dilaDateGoal) {
          dilaDateGoal = commitDilaDate
          // Check if each origin has a commit with the new dilaDateGoal.
          continue tryNextDilaDate
        }
      }
      // The commits of each origin have the same Dila date.
      yield {
        dilaDate: dilaDateGoal,
        sourceCommitByOrigine: { ...commitByOrigine },
      }
      // Go to the next commit of each origin and look again for a Dila date
      // that is present in the commits of each origin.
      continue iterCommitsWithSameDilaDate
    }
  }
}
