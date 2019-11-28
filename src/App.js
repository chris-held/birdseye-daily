import React, { useState, useEffect } from "react";
import ApolloClient from "apollo-boost";

import { ApolloProvider, useQuery, useMutation } from "@apollo/react-hooks";
import gql from "graphql-tag";
import moment from "moment";

const LOGIN = gql`
  mutation Authenticate($email: String!, $password: String!) {
    authenticate(email: $email, password: $password) {
      token
      user {
        id
      }
    }
  }
`;

const GET_TASKS = gql`
  query($startDate: String!, $endDate: String!) {
    tasksByDate(startDate: $startDate, endDate: $endDate) {
      title
      uuid
      completedAt
      startAt
    }
  }
`;

const UPDATE_TASK = gql`
  mutation updateTask($uuid: String!, $completedAt: String) {
    updateTask(uuid: $uuid, completedAt: $completedAt) {
      title
      uuid
      completedAt
      startAt
    }
  }
`;

const CREATE_TASK = gql`
  mutation createTask($title: String!, $startAt: String) {
    createTask(title: $title, startAt: $startAt) {
      title
      uuid
      completedAt
      startAt
    }
  }
`;

const uri = "https://staging.usebirdseye.com/graph";

const client = new ApolloClient({
  uri,
  request: operation => {
    const token = localStorage.getItem("token");
    operation.setContext({
      headers: {
        authorization: token ? `Bearer ${token}` : ""
      }
    });
  }
});

const Login = ({ setToken }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginMutation, { error, loading, data }] = useMutation(LOGIN);
  const handleSubmit = async () => {
    loginMutation({ variables: { email, password } });
  };

  useEffect(() => {
    if (data && data.authenticate) {
      setToken(data.authenticate.token);
      window.localStorage.setItem("token", data.authenticate.token);
    }
  }, [data, setToken]);

  return (
    <div>
      <div className="max-w-sm px-4 rounded overflow-hidden shadow-lg bg-white">
        <img
          className="ml-auto mr-auto pt-4"
          alt="brand"
          src="https://staging.usebirdseye.com/images/brand.png"
        />
        <form className="bg-white rounded px-8 pt-6 pb-8">
          <div className="mb-4">
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="email"
              type="text"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email"
            />
          </div>
          <div className="mb-4">
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
            />
            {error && (
              <p className="text-red-500 text-xs">
                Invalid username or password.
              </p>
            )}
          </div>
          <div className="flex items-center justify-between">
            <button
              className="bg-purple-900 w-full hover:bg-purple-800 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              type="button"
              disabled={loading}
              onClick={handleSubmit}
            >
              Sign In
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Dashboard = ({ setToken }) => {
  const [newTaskName, setNewTaskName] = useState("");
  const startDate = moment()
    .startOf("day")
    .toDate();
  const endDate = moment()
    .add(7, "days")
    .endOf("day")
    .toDate();
  const { data, loading, error } = useQuery(GET_TASKS, {
    variables: {
      startDate,
      endDate
    }
  });

  const [updateTask, { loading: updateLoading }] = useMutation(UPDATE_TASK);
  const [createTask, { loading: createLoading }] = useMutation(CREATE_TASK);

  //TODO: better handling of loading / error states
  if (loading || updateLoading || createLoading) {
    return null;
  }

  if (error) {
    console.log(error);
    return null;
  }

  const tasks = data.tasksByDate.filter(t =>
    moment(t.startAt).isBetween(startDate, endDate)
  );

  const onChecked = ({ uuid, completedAt }) =>
    updateTask({
      variables: { uuid, completedAt: completedAt ? null : new Date() },
      refetchQueries: [
        {
          query: GET_TASKS,
          variables: {
            startDate,
            endDate
          }
        }
      ]
    });

  const onCreate = () => {
    createTask({
      variables: { title: newTaskName, startAt: new Date() },
      refetchQueries: [
        {
          query: GET_TASKS,
          variables: {
            startDate,
            endDate
          }
        }
      ]
    });
    setNewTaskName("");
  };

  return (
    <div className="max-w-sm px-4 mb-6 mt-16">
      <div className="w-full flex">
        <div className="w-full max-w-sm rounded  mb-4 flex">
          <input
            className="appearance-none w-8/12 bg-transparent border-none w-full text-gray-500 mr-3 py-1 px-2 leading-tight focus:outline-none"
            type="text"
            placeholder="Enter a New Task"
            aria-label="Task Name"
            value={newTaskName}
            onChange={e => setNewTaskName(e.target.value)}
          />
          <button
            className="bg-purple-900 w-4/12 hover:bg-purple-800 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            type="button"
            onClick={onCreate}
          >
            Create
          </button>
        </div>
      </div>
      {tasks.map(task => {
        return (
          <form
            key={task.uuid}
            className="w-full max-w-sm bg-white rounded px-4 pt-4 pb-4 mb-4 flex"
          >
            <div className="w-11/12">
              <p className="mr-4">{task.title}</p>
            </div>
            <div className="w-1/12">
              <input
                checked={!!task.completedAt}
                className="mr-2 leading-tight"
                type="checkbox"
                onChange={() => onChecked(task)}
              />
            </div>
          </form>
        );
      })}
      <button
        className="bg-purple-900 w-full hover:bg-purple-800 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        type="button"
        onClick={() => {
          window.localStorage.setItem("token", "");
          setToken("");
        }}
      >
        Logout
      </button>
    </div>
  );
};
const App = () => {
  const [token, setToken] = useState(window.localStorage.getItem("token"));

  return (
    <ApolloProvider client={client}>
      <div
        className={`flex bg-gray-800 justify-center items-center ${
          token ? "h-full" : "h-screen"
        }`}
      >
        {token ? (
          <Dashboard setToken={setToken} />
        ) : (
          <Login setToken={setToken} />
        )}
      </div>
    </ApolloProvider>
  );
};

export default App;
