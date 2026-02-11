export function getHtml(item: DataTransferItem) {
    return new Promise<string>((resolve) => {
        item.getAsString(resolve);
    });
}
