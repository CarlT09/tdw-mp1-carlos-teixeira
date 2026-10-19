import { expect, test } from "vitest";
import { sum } from "./sum";

test("adds 2 + 2 to equal 4", () => {
  expect(sum(2, 2)).toBe(4);
});

test("adds -1 + 1 to equal 0", () => {
  expect(sum(-1, 1)).toBe(0);
});
