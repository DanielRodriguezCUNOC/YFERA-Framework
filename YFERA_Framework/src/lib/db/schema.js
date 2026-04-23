export const DB_NAME = "yfera_workspace_db";
export const DB_VERSION = 1;

export const STORES = {
  projects: "id, name, createdAt, updatedAt, lastOpenedAt",
  nodes: "id, projectId, parentId, type, name, ext, order, updatedAt, [projectId+parentId], [projectId+type]",
  tabs: "id, projectId, nodeId, order, pinned",
  uiState: "id, projectId, activeNodeId, updatedAt"
};

