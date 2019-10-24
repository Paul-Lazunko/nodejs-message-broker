export function roundRobinGetter(items: any[]): any {
  if ( items.length > 1 ) {
    const rid = items.shift();
    items.push(rid);
    return rid;
  }
  return items[0];
}
