// Article bodies as simple JSON blocks (the shape a CMS / API would return).
// Block types:
//   { type: "p", text }
//   { type: "h2" | "h3", id, text }       <- h2 ids feed the table of contents
//   { type: "quote", text }
//   { type: "list", items: [] }
//   { type: "callout", text }
//   { type: "code", language, code }
//
// Posts without an entry here fall back to their excerpt (see BlogPost.jsx).

export const ARTICLES = {
  "why-i-stopped-chasing-the-perfect-draft": [
    {
      type: "p",
      text: "For two years I kept a folder of drafts I was “almost ready” to publish. Every single one was missing the same thing: permission to be imperfect.",
    },
    { type: "h2", id: "the-trap-of-polishing", text: "The trap of polishing" },
    {
      type: "p",
      text: "Polishing feels productive. You swap a word, move a paragraph, rework the title, and an hour later the draft looks busier but is no closer to being read. Editing a post nobody has seen is a clever way of avoiding the only feedback that matters.",
    },
    {
      type: "quote",
      text: "A published post that is 80% right teaches you more than a perfect one that never leaves your laptop.",
    },
    { type: "h2", id: "the-routine-that-worked", text: "The routine that worked" },
    {
      type: "p",
      text: "I replaced “make it perfect” with a small, boring routine that I could repeat every week:",
    },
    {
      type: "list",
      items: [
        "Write the full draft in one sitting, without editing as I go.",
        "Leave it overnight, then do a single editing pass for clarity.",
        "Publish within 48 hours of finishing the first draft.",
        "Note what readers actually responded to and let that shape the next post.",
      ],
    },
    {
      type: "callout",
      text: "Rule of thumb: if the post would still help one person, it is ready.",
    },
    { type: "h2", id: "what-changed", text: "What changed" },
    {
      type: "p",
      text: "In three months I published more than I had in the previous two years. Not every post was good, but the good ones only existed because the average ones came first.",
    },
    {
      type: "p",
      text: "If you are sitting on a folder of almost-finished drafts, pick the smallest one, give it one honest edit and publish it today. The next one will be easier.",
    },
  ],

  "react-state-without-the-headache": [
    {
      type: "p",
      text: "Most state problems in React are not really about state. They are about putting it in the wrong place. Here is a simple way to decide.",
    },
    { type: "h2", id: "start-with-usestate", text: "Start with useState" },
    {
      type: "p",
      text: "If only one component cares about a value, keep it in that component. It is the simplest option and it is usually enough.",
    },
    {
      type: "code",
      language: "jsx",
      code: `function LikeButton() {
  const [liked, setLiked] = useState(false);

  return (
    <button onClick={() => setLiked((v) => !v)}>
      {liked ? "Liked" : "Like"}
    </button>
  );
}`,
    },
    { type: "h2", id: "lift-state-when-siblings-need-it", text: "Lift state when siblings need it" },
    {
      type: "p",
      text: "When two components need the same value, move it to their closest common parent and pass it down as props. Resist the urge to reach for global state this early.",
    },
    { type: "h2", id: "reach-for-a-reducer", text: "Reach for a reducer when updates multiply" },
    {
      type: "p",
      text: "Once a component has several related pieces of state and many ways to change them, a reducer keeps the logic in one predictable place.",
    },
    {
      type: "code",
      language: "jsx",
      code: `function reducer(state, action) {
  switch (action.type) {
    case "add":
      return { ...state, items: [...state.items, action.item] };
    case "remove":
      return { ...state, items: state.items.filter((i) => i.id !== action.id) };
    default:
      return state;
  }
}

const [state, dispatch] = useReducer(reducer, { items: [] });`,
    },
    {
      type: "callout",
      text: "Keep state as close as possible to where it is used, and move it up only when you have to.",
    },
  ],
};

export const DEFAULT_AUTHOR_BIO =
  "Writer and developer sharing practical lessons from building things on the web.";