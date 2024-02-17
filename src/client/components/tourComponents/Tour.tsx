import React, { useState, useEffect } from 'react';
import { useParams, useLoaderData } from 'react-router-dom';
import axios from 'axios';

import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';

import Waypoint from './Waypoint';
import Modal from './Modal';
import Map from '../Map';

type Tour = {
  id: number;
  tourName: string;
  description: string;
  id_createdByUser: number;
};

const Tour = (): JSX.Element => {
  // useParam hook to retrieve specific Tour
  const { id } = useParams();
  // loader returning user id from session verification
  const userId = useLoaderData();
  const [edit, setEdit] = useState<boolean>(false);
  const [tour, setTour] = useState<Tour>();
  const [creator, setCreator] = useState<string>('');

  //state for Waypoints array, modal pop-up dialog
  const [waypoints, setWaypoints] = useState<object[]>([]);
  const [wpName, setWpName] = useState<string>('');
  const [wpDesc, setWpDesc] = useState<string>('');
  const [long, setLong] = useState(0);
  const [lat, setLat] = useState(0);
  const [modal, setModal] = useState<boolean>(false);
  const [errorModal, setErrorModal] = useState<boolean>(false);

  //state for draggable sorting of waypoint list
  const [dragStart, setDragStart] = useState<number>(0);
  const [dragOver, setDragOver] = useState<number>(0);

  //initial useEffect, not sure how to use params hook from loader atm
  useEffect(() => {
    getTour(id);
    getTourWPs(id);
  }, []);

  useEffect(() => {
    setEdit(userId === tour?.id_createdByUser);
  }, [tour]);

  // change event handlers for modal inputs
  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    setState: React.Dispatch<string>
  ) => {
    setState(event.target.value);
  };

  // function passed into Map to track gps coordinates for waypoint creation
  const passCoords = (long: number, lat: number) => {
    setLong(long);
    setLat(lat);
  };

  // onDragEnd handler that sorts waypoints array into new order
  const onDragEnd = () => {
    const newOrder = [...waypoints]; // spread state into new array to not mutate
    const dragged = newOrder.splice(dragStart, 1); // returns the dragged item
    newOrder.splice(dragOver, 0, ...dragged); // insert the dragged item into new position in array

    axios
      .put('/db/waypointsOrder/', { newOrder, tourId: id }) // pass the newly-ordered array (plus tourId to update join table as well)
      .then((res) => {
        if (res.status === 200) {
          getTourWPs(id); // get updated waypoints (record sorting handled by query server-side)
        }
      })
      .catch((err: string) =>
        console.error('Could not PUT updates on waypoints: ', err)
      );
  };

  // axios requests to db to get tour by id
  const getTour = (id: string | undefined) => {
    axios(`/db/tour/${id}`)
      .then(({ data }) => {
        setTour(data[0]);
        const userId = data[0].id_createdByUser;
        getCreator(userId);
      })
      .catch((err: string) => console.error('Could not GET tour by id: ', err));
  };

  // gets username of tour creator
  const getCreator = (userId: number | undefined) => {
    axios(`/db/tourCreatedBy/${userId}`)
      .then(({ data }) => {
        setCreator(data[0].username);
      })
      .catch((err: string) => console.error('Could not GET user by id: ', err));
  };

  // gets waypoints associated with the particular tourId
  const getTourWPs = (tourId: string | undefined) => {
    axios(`/db/tourWaypoints/${tourId}`)
      .then(({ data }) => {
        setWaypoints(data);
      })
      .catch((err: string) =>
        console.error('Could not GET waypoints by tour id: ', err)
      );
  };

  const openWaypointModal = () => {
    if (long && lat) {
      setModal(true);
    } else {
      setErrorModal(true);
    }
  };

  // and post waypoint to db
  const postWaypoint = () => {
    axios
      .post('/db/waypoint/', {
        waypoint: {
          waypointName: wpName,
          description: wpDesc,
          long,
          lat,
        },
        id_tour: id,
      })
      .then((res) => {
        if (res.status === 201) {
          setModal(false);
          setWpName('');
          setWpDesc('');
          getTourWPs(id);
        }
      })
      .catch((err: string) => console.error('Could not POST waypoint: ', err));
  };

  return (
    <div>
      <Stack spacing={2}>
        <Grid
          container
          direction='row'
          justifyContent='space-between'
          alignItems='center'
        >
          <Typography variant='h2' fontWeight='bold' gutterBottom>
            {tour?.tourName}
          </Typography>
          <Typography variant='body1' gutterBottom>
            {tour?.description}
          </Typography>
          <Typography variant='caption' gutterBottom>
            Created by: {creator}
          </Typography>
        </Grid>

        <Map waypoints={waypoints} passCoords={passCoords} />

        <Grid
          container
          direction='row'
          justifyContent='flex-end'
          alignItems='baseline'
        >
          {edit && (
            <Button
              startIcon={<AddIcon />}
              variant='contained'
              color='primary'
              onClick={openWaypointModal}
            >
              Add Waypoint
            </Button>
          )}
        </Grid>

        <Grid
          container
          direction='row'
          justifyContent='center'
          alignItems='baseline'
        >
          <Typography variant='h3' gutterBottom>
            Waypoints
          </Typography>
        </Grid>

        <Stack spacing={1} className='waypoint-stack'>
          {waypoints.map((wp, i) => (
            <div
              key={i}
              draggable={edit}
              onDragStart={() => setDragStart(i)}
              onDragEnter={() => setDragOver(i)}
              onDragEnd={onDragEnd}
              onDragOver={(e) => e.preventDefault()}
            >
              <Waypoint
                getTourWPs={getTourWPs}
                id_tour={id}
                waypoint={wp}
                edit={edit}
              ></Waypoint>
            </div>
          ))}
        </Stack>
      </Stack>

      <Modal openModal={modal} closeModal={() => setModal(false)}>
        <div>
          <TextField
            autoFocus
            fullWidth
            label='Give the waypoint a name'
            value={wpName}
            onChange={(e) => handleChange(e, setWpName)}
            helperText='Waypoint Name'
          />
        </div>
        <br />
        <div>
          <TextField
            autoFocus
            fullWidth
            multiline
            label='Give the waypoint a description'
            value={wpDesc}
            onChange={(e) => handleChange(e, setWpDesc)}
            helperText='Waypoint Description'
          />
        </div>
        <br />
        <Button
          startIcon={<AddIcon />}
          size='small'
          variant='contained'
          color='primary'
          onClick={postWaypoint}
        >
          Save waypoint
        </Button>
      </Modal>

      <Modal openModal={errorModal} closeModal={() => setErrorModal(false)}>
        <Typography variant='body1'>
          Please click location on map first.
        </Typography>
        <br />
      </Modal>
    </div>
  );
};

export default Tour;
