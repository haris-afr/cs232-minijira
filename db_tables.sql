CREATE TABLE "user" (
	userID SERIAL PRIMARY KEY,
	username VARCHAR(100) NOT NULL,
	email VARCHAR(100) NOT NULL,
	password VARCHAR(512) NOT NULL,
	userCreatedOn TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE repository (
	repoID SERIAL PRIMARY KEY,
	repoName VARCHAR(100) NOT NULL,
	repoLink VARCHAR(512) NOT NULL,
	defBranch VARCHAR(100),
	repoVisibility BOOL NOT NULL
);

CREATE TABLE project (
	projectID SERIAL PRIMARY KEY,
	ownerID INT,
	repoID INT,
	projectTitle VARCHAR(512) NOT NULL,
	projectDescript VARCHAR(1000),
	projCreatedOn TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

	CONSTRAINT fk_repo
		FOREIGN KEY (repoID)
		REFERENCES repository(repoID)
		ON DELETE SET NULL,

	CONSTRAINT fk_user
		FOREIGN KEY (ownerID)
		REFERENCES "user"(userID)
);

CREATE TABLE works (
	userID INT,
	projectID INT,

	CONSTRAINT fk_user
		FOREIGN KEY (userID)
		REFERENCES "user"(userID)
		ON DELETE CASCADE,

	CONSTRAINT fk_project
		FOREIGN KEY (projectID)
		REFERENCES project(projectID)
		ON DELETE CASCADE,

	PRIMARY KEY(userID, projectID)
);

CREATE TABLE manages (
	userID INT,
	projectID INT,

	CONSTRAINT fk_user
		FOREIGN KEY (userID)
		REFERENCES "user"(userID)
		ON DELETE CASCADE,

	CONSTRAINT fk_project
		FOREIGN KEY (projectID)
		REFERENCES project(projectID)
		ON DELETE CASCADE,

	PRIMARY KEY(userID, projectID)
);

CREATE TABLE sprint (
    sprintID SERIAL PRIMARY KEY,
    projectID INT,
    title VARCHAR(255),
    goal TEXT,
	deadline DATE,
	createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

	CONSTRAINT fk_project
		FOREIGN KEY (projectID)
		REFERENCES project(projectID)
		ON DELETE CASCADE
);

CREATE TABLE story (
    storyID SERIAL PRIMARY KEY,
    projectID INT,
    storyDescript VARCHAR(1000),
    storyDeadline TIMESTAMP,
    storyStatus VARCHAR(50),
    storyTitle VARCHAR(255),
    storyCreatedOn TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

	CONSTRAINT fk_project
		FOREIGN KEY (projectID)
		REFERENCES project(projectID)
		ON DELETE CASCADE
);

CREATE TABLE task (
    taskID SERIAL PRIMARY KEY,
    storyID INT,
    sprintID INT,
    assignedTo INT,
    taskDeadline TIMESTAMP,
    taskStatus VARCHAR(50),
    taskDescript VARCHAR(1000),
    taskCreatedOn TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

	CONSTRAINT fk_story
		FOREIGN KEY (storyID)
		REFERENCES story(storyID)
		ON DELETE CASCADE,
	CONSTRAINT fk_sprint
		FOREIGN KEY (sprintID)
		REFERENCES sprint(sprintID)
		ON DELETE SET NULL,
	CONSTRAINT fk_user
		FOREIGN KEY (assignedTo)
		REFERENCES "user"(userID)
		ON DELETE SET NULL
);

CREATE TABLE "comment" (
    commentID SERIAL PRIMARY KEY,
    userID INT,
    taskID INT,
    commentTxt TEXT,
    commentCreatedOn TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user
		FOREIGN KEY (userID)
		REFERENCES "user"(userID)
		ON DELETE CASCADE,
	CONSTRAINT fk_task
		FOREIGN KEY (taskID)
		REFERENCES task(taskID)
		ON DELETE CASCADE
);

CREATE TABLE attachment (
    attachID SERIAL PRIMARY KEY,
    taskID INT,
    userID INT,
    attachName VARCHAR(255),
    attachUrl VARCHAR(512),

	CONSTRAINT fk_user
		FOREIGN KEY (userID)
		REFERENCES "user"(userID)
		ON DELETE SET NULL,
	CONSTRAINT fk_task
		FOREIGN KEY (taskID)
		REFERENCES task(taskID)
		ON DELETE CASCADE
);
