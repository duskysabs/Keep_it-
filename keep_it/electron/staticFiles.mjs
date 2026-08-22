import { existsSync, statSync } from "node:fs";
import { extname, isAbsolute, join, relative, resolve } from "node:path";

const isInsideDirectory = (directory, filePath) => {
  const relativePath = relative(directory, filePath);
  return relativePath === "" || (!relativePath.startsWith("..") && !isAbsolute(relativePath));
};

export const resolveStaticFile = ({ requestUrl, staticDirectory }) => {
  const staticRoot = resolve(staticDirectory);
  let pathname;

  try {
    pathname = decodeURIComponent(new URL(requestUrl).pathname);
  } catch {
    return null;
  }

  const requestedPath = pathname.replace(/^[/\\]+/, "");
  let filePath = resolve(join(staticRoot, requestedPath));

  if (!isInsideDirectory(staticRoot, filePath)) return null;

  if (requestedPath === "" || pathname.endsWith("/") || (existsSync(filePath) && statSync(filePath).isDirectory())) {
    filePath = resolve(join(filePath, "index.html"));
  } else if (!existsSync(filePath) && extname(filePath) === "") {
    filePath = resolve(join(filePath, "index.html"));
  }

  if (!isInsideDirectory(staticRoot, filePath) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    const notFoundPath = resolve(join(staticRoot, "404.html"));
    return isInsideDirectory(staticRoot, notFoundPath) && existsSync(notFoundPath) ? notFoundPath : null;
  }

  return filePath;
};
