import { describe, expect, test } from "@effect/vitest"

import { GITHUB_REPO_URL, OSHIMALAND_SITE_URL, PAGE_DESCRIPTION, PAGE_TITLE } from "./site"

describe("site config", () => {
  test("points at public github and oshimaland URLs", () => {
    expect(GITHUB_REPO_URL.startsWith("https://github.com/")).toBe(true)
    expect(OSHIMALAND_SITE_URL).toBe("https://www.oshimaland.com/")
  })

  test("exposes page title and description for the document shell", () => {
    expect(PAGE_TITLE).toBe("OL Proxy")
    expect(PAGE_DESCRIPTION.toLowerCase()).toContain("oshimaland")
    expect(PAGE_DESCRIPTION.length).toBeGreaterThan(40)
  })
})
