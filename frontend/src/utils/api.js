import request from "./request";

export function getHealth() {
  return request.get("/health");
}

export function getDemoExperiments() {
  return request.get("/experiments/demo");
}

export function getDemoGallery() {
  return request.get("/gallery/demo");
}

export function getDemoReport() {
  return request.get("/reports/demo");
}

export function getLabDemo(experimentId) {
  return request.get(`/lab/demo/${experimentId}`);
}

export function getDemoRecord(recordId) {
  return request.get(`/records/demo/${recordId}`);
}

export function getReportFromRecord(recordId) {
  return request.get(`/reports/from-record/${recordId}`);
}

export function createRecord(payload) {
  return request.post("/records", payload);
}

export function getRecord(recordId) {
  return request.get(`/records/${recordId}`);
}

export function getRecordList() {
  return request.get("/records");
}

export function deleteRecord(recordId) {
  return request.delete(`/records/${recordId}`);
}

export function createCommunityShare(payload) {
  return request.post("/community/shares", payload);
}

export function getCommunityShares() {
  return request.get("/community/shares");
}

export function getCommunityShare(shareId) {
  return request.get(`/community/shares/${shareId}`);
}
