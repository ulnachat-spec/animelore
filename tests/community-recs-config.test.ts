import { afterEach, describe, expect, it } from "vitest";
import { communityRecsEnabled } from "../lib/community-recs-config";

const original = process.env.COMMUNITY_RECS_ENABLED;

afterEach(() => {
  if (original == null) delete process.env.COMMUNITY_RECS_ENABLED;
  else process.env.COMMUNITY_RECS_ENABLED = original;
});

describe("community recommendation configuration", () => {
  it("缺省或空配置时默认开启，避免部署环境静默隐藏核心模块", () => {
    delete process.env.COMMUNITY_RECS_ENABLED;
    expect(communityRecsEnabled()).toBe(true);
    process.env.COMMUNITY_RECS_ENABLED = "";
    expect(communityRecsEnabled()).toBe(true);
  });

  it("只接受明确 false/0 作为关闭开关", () => {
    process.env.COMMUNITY_RECS_ENABLED = "false";
    expect(communityRecsEnabled()).toBe(false);
    process.env.COMMUNITY_RECS_ENABLED = "0";
    expect(communityRecsEnabled()).toBe(false);
    process.env.COMMUNITY_RECS_ENABLED = "true";
    expect(communityRecsEnabled()).toBe(true);
  });
});
