const textCapitalize = (text: string | undefined, splitBy: string = "_") => {
    if (!text) return "";
    try {
        return text.split(splitBy).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
    } catch (error) {
        return text;
    }
}

export { textCapitalize };