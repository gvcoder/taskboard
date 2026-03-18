# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - banner [ref=e3]:
      - heading "Trello Lite" [level=1] [ref=e4]
      - button "Sign out" [ref=e5]:
        - img [ref=e6]
        - text: Sign out
    - main [ref=e9]:
      - generic [ref=e10]:
        - heading "My Boards" [level=2] [ref=e11]
        - button "New Board" [active] [ref=e12]:
          - img [ref=e13]
          - text: New Board
      - generic [ref=e14]:
        - generic [ref=e17] [cursor=pointer]:
          - paragraph [ref=e18]: Board To Delete
          - button "Delete board" [ref=e19]:
            - img [ref=e20]
        - generic [ref=e25] [cursor=pointer]:
          - paragraph [ref=e26]: Nav Test Board
          - button "Delete board" [ref=e27]:
            - img [ref=e28]
        - generic [ref=e33] [cursor=pointer]:
          - paragraph [ref=e34]: E2E Test Board
          - button "Delete board" [ref=e35]:
            - img [ref=e36]
  - button "Open Next.js Dev Tools" [ref=e44] [cursor=pointer]:
    - img [ref=e45]
  - alert [ref=e48]
```