export const formatDate = (iso) => {
    console.log("fdsa;jfa;sldkjf;askdjf;aksjdf;laksdflk",iso)
    return new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(new Date(iso));
}