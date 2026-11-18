Never use /tmp. Put temporary/scratch files in ./.scratch/ inside this project.
Run shell commands from the project root. Don't chain multiple `cd`s; use paths
relative to the root instead (e.g. grep ... references/old_django/data_mapping/infrastructure/view.py).
Prefer one simple command per call over long && / | chains.