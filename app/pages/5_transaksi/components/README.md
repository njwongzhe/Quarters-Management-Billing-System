# Transaction Fast Reading & Optimization Logic

To handle large volumes of transaction records without lagging the UI, three performance patterns are used:

## Dynamic Summary Switch (includeSummary)
Calculating full aggregations (Total Count, Sum of Debits, Sum of Credits) using SQL count and sum aggregates is expensive.
* First Load / Filter Change: The UI sends "includeSummary=true". The database computes the transaction list and the summary numbers concurrently using Promise.all.
* Pagination (Next/Prev Page): The client recognizes that the summary counters are already loaded. It appends "includeSummary=false" to the network query. The API completely skips the heavy aggregate calculations, fetching only the targeted 10 rows for that specific page.

## Input Search Debouncing
In the filter panel, typing into the search bar updates an internal fast-response buffer state (searchDraft). The application waits for a 300ms cooling window after the user stops typing before triggering the actual filter change. This prevents firing overlapping database queries for every single character typed.

## Request Abortion (AbortController)
If a user rapidly clicks different filter checkboxes or pages through records quickly, multiple asynchronous HTTP network requests are generated. 
To prevent data race conditions and browser choking, the system utilizes a native AbortController mechanism. The moment a new interaction is registered, any preceding request still pending in the browser network layer is immediately canceled in-flight, ensuring only the final selected query is processed and rendered.