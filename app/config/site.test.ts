import { describe, expect, test } from "bun:test"

import { GITHUB_REPO_URL, OSHIMALAND_SITE_URL } from "./site"

describe("site config", () => {
  test("points at public github and oshimaland URLs", () => {
    expect(GITHUB_REPO_URL.startsWith("https://github.com/")).toBe(true)
    expect(OSHIMALAND_SITE_URL).toBe("https://www.oshimaland.com/")
  })
})
